import os
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.department import Department, Team, team_members, Ward
from app.models.issue import (
    Issue, IssueCategory, IssueSeverity, IssueStatus,
    IssuePhoto, IssueAssignment, IssueUpdate, IssueComment,
    IssueDuplicate, SavedRoute, Notification
)
from app.services.priority_engine import calculate_priority_score

def seed_database():
    db = SessionLocal()
    try:
        print("--- Starting deterministic database seed for Civic Fix ---")
        
        # Enable PostGIS extension
        db.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        db.commit()

        # Re-create all tables cleanly
        Base.metadata.create_all(bind=engine)

        # Clear existing demo data to ensure repeatability
        print("Clearing existing data...")
        db.execute(text("TRUNCATE TABLE notifications, audit_logs, saved_routes, issue_duplicates, issue_comments, issue_updates, issue_assignments, issue_photos, issues, team_members, teams, departments, wards, users RESTART IDENTITY CASCADE;"))
        db.commit()

        # 1. Seed Departments
        print("Seeding departments...")
        dept_roads = Department(name="Roads & Infrastructure", code="ROADS", description="Road construction, pothole repairs, bridges and pavements")
        dept_swm = Department(name="Solid Waste Management", code="SWM", description="Garbage collection, waste processing, municipal bins")
        dept_water = Department(name="Water Supply & Sewerage", code="WATER", description="Drinking water pipeline network, drainage and storm sewers")
        dept_elec = Department(name="Electrical & Streetlights", code="ELEC", description="Street illumination, high-mast lamps, junction signals")
        
        db.add_all([dept_roads, dept_swm, dept_water, dept_elec])
        db.commit()

        # 2. Seed Wards (Pune Municipal Corporation)
        print("Seeding Pune wards...")
        wards_data = [
            ("Shivajinagar", "WARD-01", "Central Zone"),
            ("Kothrud", "WARD-02", "West Zone"),
            ("Hadapsar", "WARD-03", "East Zone"),
            ("Viman Nagar", "WARD-04", "North-East Zone"),
            ("Deccan Gymkhana", "WARD-05", "Central-West Zone"),
            ("Kasba Peth", "WARD-06", "Old City Zone"),
        ]
        wards = []
        for name, code, zone in wards_data:
            w = Ward(name=name, code=code, zone=zone)
            db.add(w)
            wards.append(w)
        db.commit()

        # 3. Seed Users (All 4 roles)
        print("Seeding demo users for all 4 roles...")
        hashed_pwd = get_password_hash("CivicFix2026!")
        
        admin_user = User(
            email="admin@civicfix.org",
            hashed_password=hashed_pwd,
            full_name="Dr. Rajesh Sharma (Municipal Commissioner)",
            phone="+91 98220 01100",
            role=UserRole.ADMIN,
            is_active=True
        )
        officer_roads = User(
            email="officer@civicfix.org",
            hashed_password=hashed_pwd,
            full_name="Anjali Deshmukh (Zonal Officer)",
            phone="+91 98220 02200",
            role=UserRole.MUNICIPAL_OFFICER,
            department_id=dept_roads.id,
            is_active=True
        )
        officer_swm = User(
            email="officer.swm@civicfix.org",
            hashed_password=hashed_pwd,
            full_name="Vikram Kulkarni (Sanitation Officer)",
            phone="+91 98220 02201",
            role=UserRole.MUNICIPAL_OFFICER,
            department_id=dept_swm.id,
            is_active=True
        )
        worker_user = User(
            email="worker@civicfix.org",
            hashed_password=hashed_pwd,
            full_name="Ramesh Jadhav (Field Lead)",
            phone="+91 98220 03300",
            role=UserRole.FIELD_WORKER,
            department_id=dept_roads.id,
            is_active=True
        )
        worker_water = User(
            email="worker.water@civicfix.org",
            hashed_password=hashed_pwd,
            full_name="Suresh Patil (Drainage Technician)",
            phone="+91 98220 03301",
            role=UserRole.FIELD_WORKER,
            department_id=dept_water.id,
            is_active=True
        )
        citizen_user = User(
            email="citizen@civicfix.org",
            hashed_password=hashed_pwd,
            full_name="Pooja Joshi (Citizen)",
            phone="+91 98220 04400",
            role=UserRole.CITIZEN,
            is_active=True
        )
        citizen_two = User(
            email="citizen2@civicfix.org",
            hashed_password=hashed_pwd,
            full_name="Amit Verma (Resident)",
            phone="+91 98220 04401",
            role=UserRole.CITIZEN,
            is_active=True
        )
        
        db.add_all([admin_user, officer_roads, officer_swm, worker_user, worker_water, citizen_user, citizen_two])
        db.commit()

        # 4. Seed Teams & Members
        print("Seeding teams and member assignments...")
        team_road_rapid = Team(name="Road Rapid Patch Unit #1", department_id=dept_roads.id, leader_id=worker_user.id)
        team_swm_cleanup = Team(name="Central Sanitation Crew #4", department_id=dept_swm.id, leader_id=officer_swm.id)
        team_water_repairs = Team(name="Pipeline & Leak Taskforce #2", department_id=dept_water.id, leader_id=worker_water.id)
        team_lighting_unit = Team(name="Electrical Maintenance Grid #3", department_id=dept_elec.id)

        db.add_all([team_road_rapid, team_swm_cleanup, team_water_repairs, team_lighting_unit])
        db.commit()

        # Link team members
        db.execute(team_members.insert().values(team_id=team_road_rapid.id, user_id=worker_user.id))
        db.execute(team_members.insert().values(team_id=team_water_repairs.id, user_id=worker_water.id))
        db.commit()

        # 5. Seed 35 Realistic Pune Civic Issues
        print("Seeding 35 sample civic issues across Pune...")
        now = datetime.now(timezone.utc)
        
        raw_issues = [
            # Deccan & FC Road
            {
                "title": "Severe deep pothole causing vehicle skids",
                "description": "Large 2ft diameter pothole near Goodluck Chowk opposite cafe. Two-wheelers frequently losing balance during evening peak hours.",
                "category": IssueCategory.POTHOLE,
                "severity": IssueSeverity.CRITICAL,
                "status": IssueStatus.IN_PROGRESS,
                "lat": 18.5168, "lon": 73.8415,
                "ward_idx": 4, # Deccan
                "address": "FC Road, Near Goodluck Chowk, Deccan Gymkhana",
                "days_ago": 4,
                "assigned_team": team_road_rapid,
                "assigned_user": worker_user
            },
            {
                "title": "Duplicate report: Deep pothole at Goodluck Chowk",
                "description": "Pothole on FC Road right at the intersection. Very dangerous for bikes! Needs patch work urgently.",
                "category": IssueCategory.POTHOLE,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.ASSIGNED,
                "lat": 18.5170, "lon": 73.8417, # ~25m away from #1
                "ward_idx": 4,
                "address": "Goodluck Chowk corner, Deccan Gymkhana",
                "days_ago": 3,
                "is_dup_of": 0
            },
            {
                "title": "Storm drain overflow and waterlogging",
                "description": "Choked storm drain causing ankle-deep stagnant dirty water spanning entire pedestrian pathway and road edge.",
                "category": IssueCategory.WATERLOGGING,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.VERIFIED,
                "lat": 18.5192, "lon": 73.8430,
                "ward_idx": 4,
                "address": "Fergusson College Main Gate, Shivajinagar/Deccan",
                "days_ago": 2
            },
            # Shivajinagar
            {
                "title": "Main drinking water pipe burst on JM Road",
                "description": "High pressure clean water gushing out onto pavement from cracked underground supply main pipe. Massive water loss for past 8 hours.",
                "category": IssueCategory.WATER_LEAK,
                "severity": IssueSeverity.CRITICAL,
                "status": IssueStatus.IN_PROGRESS,
                "lat": 18.5284, "lon": 73.8502,
                "ward_idx": 0, # Shivajinagar
                "address": "JM Road, Opposite Balgandharva Rangmandir",
                "days_ago": 1,
                "assigned_team": team_water_repairs,
                "assigned_user": worker_water
            },
            {
                "title": "Streetlights unlit along entire bus route stretch",
                "description": "Four consecutive streetlights dark since Monday. Road is pitch black at night creating safety hazard for women pedestrians.",
                "category": IssueCategory.STREETLIGHT,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.ASSIGNED,
                "lat": 18.5310, "lon": 73.8465,
                "ward_idx": 0,
                "address": "Model Colony 5th Cross, Shivajinagar",
                "days_ago": 5,
                "assigned_team": team_lighting_unit
            },
            {
                "title": "Long longitudinal asphalt crack expanding",
                "description": "15-meter long asphalt fissure along central carriageway. Water seeping into base course, will lead to collapse.",
                "category": IssueCategory.ROAD_CRACK,
                "severity": IssueSeverity.LOW,
                "status": IssueStatus.SUBMITTED,
                "lat": 18.5345, "lon": 73.8420,
                "ward_idx": 0,
                "address": "Senapati Bapat Road near Symbiosis College",
                "days_ago": 7
            },
            # Kothrud
            {
                "title": "Overturned overflowing garbage container",
                "description": "Public community dumper bin overflowing onto road with plastic refuse scattered across two lanes. Severe foul odor and stray cattle.",
                "category": IssueCategory.GARBAGE,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.RESOLVED,
                "lat": 18.5074, "lon": 73.8077,
                "ward_idx": 1, # Kothrud
                "address": "Paud Road, Near MIT College Junction, Kothrud",
                "days_ago": 6,
                "resolved_days_ago": 1,
                "resolution_notes": "Crew #4 dispatched with compactor truck. Cleared 2.5 tons refuse and sanitized perimeter.",
                "assigned_team": team_swm_cleanup
            },
            {
                "title": "Duplicate report: Paud Road garbage overflow",
                "description": "Trash bin spilling on Paud Road opposite MIT. Smells horrible.",
                "category": IssueCategory.GARBAGE,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.CLOSED,
                "lat": 18.5076, "lon": 73.8079, # ~30m from #6
                "ward_idx": 1,
                "address": "Paud Road near MIT gate, Kothrud",
                "days_ago": 5,
                "is_dup_of": 6,
                "resolved_days_ago": 1,
                "resolution_notes": "Handled under canonical ticket TKT-2026-0007."
            },
            {
                "title": "Fallen Gulmohar tree limb blocking bus stop",
                "description": "Heavy monsoon branch snapped and fell directly across PMT bus shelter bench and left driving lane.",
                "category": IssueCategory.FALLEN_TREE,
                "severity": IssueSeverity.CRITICAL,
                "status": IssueStatus.RESOLVED,
                "lat": 18.5015, "lon": 73.8180,
                "ward_idx": 1,
                "address": "Karve Road, Near Nal Stop Flyover, Kothrud",
                "days_ago": 10,
                "resolved_days_ago": 8,
                "resolution_notes": "Rapid chainsaw team severed branch, cleared highway lane, and transported debris to nursery depot.",
                "assigned_team": team_road_rapid
            },
            {
                "title": "Damaged metal divider railing after vehicle bump",
                "description": "Median steel guard rail smashed inward into fast lane, exposing jagged metal edges to passing motorists.",
                "category": IssueCategory.DAMAGED_INFRASTRUCTURE,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.VERIFIED,
                "lat": 18.4980, "lon": 73.8040,
                "ward_idx": 1,
                "address": "Chandani Chowk Bypass entrance, Kothrud",
                "days_ago": 2
            },
            # Kasba Peth
            {
                "title": "Clogged open gutter sewage overflow",
                "description": "Heritage lane open drain blocked with silt, greywater backing up into shop entrances on Shaniwar Peth line.",
                "category": IssueCategory.WATER_LEAK,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.IN_PROGRESS,
                "lat": 18.5204, "lon": 73.8567,
                "ward_idx": 5, # Kasba Peth
                "address": "Shaniwar Wada South Gate, Kasba Peth",
                "days_ago": 3,
                "assigned_team": team_water_repairs,
                "assigned_user": worker_water
            },
            {
                "title": "Broken heritage stone slab over storm trench",
                "description": "Pedestrian stone pavement slab fractured in half with 3ft deep void underneath. High fall hazard for elderly.",
                "category": IssueCategory.DAMAGED_INFRASTRUCTURE,
                "severity": IssueSeverity.CRITICAL,
                "status": IssueStatus.SUBMITTED,
                "lat": 18.5180, "lon": 73.8585,
                "ward_idx": 5,
                "address": "Kasba Ganpati Temple Lane, Kasba Peth",
                "days_ago": 1
            },
            # Viman Nagar
            {
                "title": "Dangerous pothole cluster outside IT Park gate",
                "description": "Series of 4 consecutive potholes filled with muddy water directly in front of main office complex entrance.",
                "category": IssueCategory.POTHOLE,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.ASSIGNED,
                "lat": 18.5665, "lon": 73.9122,
                "ward_idx": 3, # Viman Nagar
                "address": "Symbiosis Road, Clover Park, Viman Nagar",
                "days_ago": 4,
                "assigned_team": team_road_rapid
            },
            {
                "title": "Construction debris dumped on public footpath",
                "description": "Unidentified dumper truck dropped 5 cubic meters of concrete rubble and rebar rods completely blocking pedestrian sidewalk.",
                "category": IssueCategory.GARBAGE,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.SUBMITTED,
                "lat": 18.5620, "lon": 73.9180,
                "ward_idx": 3,
                "address": "New Airport Road, Near Phoenix Mall, Viman Nagar",
                "days_ago": 2
            },
            {
                "title": "Underground cable spark causing streetlight failure",
                "description": "Subsurface junction box sparking intermittently during rain; 6 streetlamps flickering and extinguished.",
                "category": IssueCategory.STREETLIGHT,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.IN_PROGRESS,
                "lat": 18.5580, "lon": 73.9050,
                "ward_idx": 3,
                "address": "Viman Nagar Central Avenue",
                "days_ago": 1,
                "assigned_team": team_lighting_unit
            },
            # Hadapsar
            {
                "title": "Heavy waterlogging under railway underpass",
                "description": "Water level reaches 3.5 feet inside railway underbridge after yesterday's showers. Three auto-rickshaws stalled.",
                "category": IssueCategory.WATERLOGGING,
                "severity": IssueSeverity.CRITICAL,
                "status": IssueStatus.VERIFIED,
                "lat": 18.5080, "lon": 73.9260,
                "ward_idx": 2, # Hadapsar
                "address": "Gadital Flyover Underpass, Pune-Solapur Road, Hadapsar",
                "days_ago": 1
            },
            {
                "title": "Duplicate: Flooding under Gadital railway bridge",
                "description": "Gadital underbridge flooded with rain water, cars unable to pass.",
                "category": IssueCategory.WATERLOGGING,
                "severity": IssueSeverity.CRITICAL,
                "status": IssueStatus.SUBMITTED,
                "lat": 18.5083, "lon": 73.9262, # ~35m from #15
                "ward_idx": 2,
                "address": "Gadital Underpass, Hadapsar",
                "days_ago": 1,
                "is_dup_of": 15
            },
            {
                "title": "Overflowing garbage dump near vegetable market",
                "description": "Vegetable waste rotting in open sunlight with swarm of flies. Market patrons and vendors complaining.",
                "category": IssueCategory.GARBAGE,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.ASSIGNED,
                "lat": 18.5040, "lon": 73.9310,
                "ward_idx": 2,
                "address": "Hadapsar Mandai, Solapur Road",
                "days_ago": 3,
                "assigned_team": team_swm_cleanup
            },
            # Additional distributed issues
            {
                "title": "Sunken road trench after telecom cable digging",
                "description": "Unrestored trench settled 6 inches below asphalt level along 30 meters.",
                "category": IssueCategory.ROAD_CRACK,
                "severity": IssueSeverity.LOW,
                "status": IssueStatus.SUBMITTED,
                "lat": 18.5140, "lon": 73.8340,
                "ward_idx": 4, # Deccan
                "address": "Prabhat Road Lane 6, Deccan",
                "days_ago": 8
            },
            {
                "title": "Broken concrete manhole cover on busy lane",
                "description": "Circular manhole cover cracked through center. Heavy trucks could collapse it completely into sewer line.",
                "category": IssueCategory.DAMAGED_INFRASTRUCTURE,
                "severity": IssueSeverity.CRITICAL,
                "status": IssueStatus.RESOLVED,
                "lat": 18.5240, "lon": 73.8470,
                "ward_idx": 0, # Shivajinagar
                "address": "Ghole Road, Shivajinagar",
                "days_ago": 9,
                "resolved_days_ago": 7,
                "resolution_notes": "High tensile ductile iron manhole ring and cover replaced.",
                "assigned_team": team_water_repairs
            },
            {
                "title": "Streetlight pole tilted at 20 degrees",
                "description": "Galvanized pole base rusted out, tilting precariously toward overhead electrical lines.",
                "category": IssueCategory.STREETLIGHT,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.VERIFIED,
                "lat": 18.5050, "lon": 73.8150,
                "ward_idx": 1, # Kothrud
                "address": "Mayur Colony Road, Kothrud",
                "days_ago": 4
            },
            {
                "title": "Stagnant puddle mosquito breeding in abandoned plot",
                "description": "Large green water pool collecting urban runoff for 3 weeks next to primary school.",
                "category": IssueCategory.WATERLOGGING,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.SUBMITTED,
                "lat": 18.5700, "lon": 73.9150,
                "ward_idx": 3, # Viman Nagar
                "address": "Behind Datta Mandir, Viman Nagar",
                "days_ago": 5
            },
            {
                "title": "Garbage burning in open trench at night",
                "description": "Toxic plastic smoke billowing into apartment complexes from open waste burn.",
                "category": IssueCategory.GARBAGE,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.REOPENED,
                "lat": 18.4980, "lon": 73.9350,
                "ward_idx": 2, # Hadapsar
                "address": "Sasane Nagar Railway crossing, Hadapsar",
                "days_ago": 6,
                "resolution_notes": "Previously marked cleared but citizen reported burning resumed."
            },
            {
                "title": "Fallen banyan branches after thunderstorm",
                "description": "Two 10-inch diameter banyan branches dangling from cables.",
                "category": IssueCategory.FALLEN_TREE,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.RESOLVED,
                "lat": 18.5220, "lon": 73.8540,
                "ward_idx": 5, # Kasba Peth
                "address": "Near Lal Mahal, Kasba Peth",
                "days_ago": 12,
                "resolved_days_ago": 11,
                "resolution_notes": "Tree trimming squad pruned tree and cleared overhead line friction."
            },
            {
                "title": "Submerged road curb during low intensity rain",
                "description": "Drain inlet blocked with plastic wrappers; water accumulates 8 inches deep.",
                "category": IssueCategory.WATERLOGGING,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.ASSIGNED,
                "lat": 18.5130, "lon": 73.8450,
                "ward_idx": 4, # Deccan
                "address": "Bhandarkar Road, Near Cafe Kathaa",
                "days_ago": 3,
                "assigned_team": team_water_repairs
            },
            {
                "title": "Pothole on bus lane causing heavy traffic jam",
                "description": "3 meter long patch of missing asphalt right before traffic light.",
                "category": IssueCategory.POTHOLE,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.IN_PROGRESS,
                "lat": 18.5300, "lon": 73.8380,
                "ward_idx": 0, # Shivajinagar
                "address": "University Road, Near E-Square, Shivajinagar",
                "days_ago": 2,
                "assigned_team": team_road_rapid,
                "assigned_user": worker_user
            },
            {
                "title": "Pedestrian zebra crossing paint completely erased",
                "description": "High speed junction without pedestrian crossing demarcation.",
                "category": IssueCategory.ROAD_CRACK,
                "severity": IssueSeverity.LOW,
                "status": IssueStatus.SUBMITTED,
                "lat": 18.5020, "lon": 73.8100,
                "ward_idx": 1, # Kothrud
                "address": "Ideal Colony signal, Kothrud",
                "days_ago": 11
            },
            {
                "title": "Leaking fire hydrant valve wasting pressure",
                "description": "Continuous water spray from municipal hydrant valve body onto sidewalk.",
                "category": IssueCategory.WATER_LEAK,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.VERIFIED,
                "lat": 18.5640, "lon": 73.9100,
                "ward_idx": 3, # Viman Nagar
                "address": "Mhada Colony Road, Viman Nagar",
                "days_ago": 4
            },
            {
                "title": "Cattle shed runoff draining into open street",
                "description": "Untreated dairy animal waste discharged directly onto tar road creating slippery slime.",
                "category": IssueCategory.OTHER,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.ASSIGNED,
                "lat": 18.5060, "lon": 73.9280,
                "ward_idx": 2, # Hadapsar
                "address": "Sayyad Nagar, Hadapsar",
                "days_ago": 5,
                "assigned_team": team_swm_cleanup
            },
            {
                "title": "Collapsed retaining boundary brick wall",
                "description": "12-foot section of municipal garden perimeter wall collapsed into lane.",
                "category": IssueCategory.DAMAGED_INFRASTRUCTURE,
                "severity": IssueSeverity.HIGH,
                "status": IssueStatus.IN_PROGRESS,
                "lat": 18.5160, "lon": 73.8590,
                "ward_idx": 5, # Kasba Peth
                "address": "Near Nana Wada, Kasba Peth",
                "days_ago": 3,
                "assigned_team": team_road_rapid
            },
            {
                "title": "Dangerous exposed electrical live wires at transformer base",
                "description": "Distribution box door ripped off; bare copper busbars accessible to pedestrians and children.",
                "category": IssueCategory.STREETLIGHT,
                "severity": IssueSeverity.CRITICAL,
                "status": IssueStatus.VERIFIED,
                "lat": 18.5150, "lon": 73.8390,
                "ward_idx": 4, # Deccan
                "address": "Apte Road, Deccan Gymkhana",
                "days_ago": 1
            },
            {
                "title": "Deep trench left unfilled after fiber optical cable laying",
                "description": "Contractors left 4-foot deep open trench across residential colony gate.",
                "category": IssueCategory.ROAD_CRACK,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.SUBMITTED,
                "lat": 18.5320, "lon": 73.8490,
                "ward_idx": 0, # Shivajinagar
                "address": "Range Hills Road, Shivajinagar",
                "days_ago": 6
            },
            {
                "title": "Overflowing garbage bins at weekly flea market spot",
                "description": "4 large steel bins overflowing with organic and polythene refuse.",
                "category": IssueCategory.GARBAGE,
                "severity": IssueSeverity.MEDIUM,
                "status": IssueStatus.RESOLVED,
                "lat": 18.5090, "lon": 73.8050,
                "ward_idx": 1, # Kothrud
                "address": "Cummins College Road, Karvenagar/Kothrud",
                "days_ago": 14,
                "resolved_days_ago": 12,
                "resolution_notes": "Bins emptied and secondary daily morning collection schedule instituted."
            },
            {
                "title": "Burst drainage chamber overflowing with sewage",
                "description": "Black water bubbling out of cast iron manhole cover with intense stench.",
                "category": IssueCategory.WATER_LEAK,
                "severity": IssueSeverity.CRITICAL,
                "status": IssueStatus.IN_PROGRESS,
                "lat": 18.5100, "lon": 73.9320,
                "ward_idx": 2, # Hadapsar
                "address": "Magarpatta South Gate, Hadapsar",
                "days_ago": 2,
                "assigned_team": team_water_repairs,
                "assigned_user": worker_water
            },
            {
                "title": "Streetlights flashing like strobe lights at traffic junction",
                "description": "Faulty ballast causing 3 high mast sodium lights to flicker erratically.",
                "category": IssueCategory.STREETLIGHT,
                "severity": IssueSeverity.LOW,
                "status": IssueStatus.SUBMITTED,
                "lat": 18.5600, "lon": 73.9140,
                "ward_idx": 3, # Viman Nagar
                "address": "Ganpati Chowk, Viman Nagar",
                "days_ago": 4
            }
        ]

        created_issues = []
        dup_pairs_to_create = []

        for idx, item in enumerate(raw_issues):
            created_dt = now - timedelta(days=item.get("days_ago", 2))
            is_resolved = item["status"] in [IssueStatus.RESOLVED, IssueStatus.CLOSED]
            
            p_calc = calculate_priority_score(
                severity=item["severity"].value,
                category=item["category"].value,
                created_at=created_dt,
                corroboration_count=2 if item.get("is_dup_of") is not None else 1,
                is_resolved=is_resolved
            )

            resolved_dt = (now - timedelta(days=item["resolved_days_ago"])) if item.get("resolved_days_ago") else None
            verified_dt = (created_dt + timedelta(hours=6)) if item["status"] != IssueStatus.SUBMITTED else None

            ticket_id = f"TKT-2026-{idx+1:04d}"
            issue = Issue(
                id=str(uuid.uuid4()),
                ticket_id=ticket_id,
                title=item["title"],
                description=item["description"],
                category=item["category"],
                severity=item["severity"],
                status=item["status"],
                latitude=item["lat"],
                longitude=item["lon"],
                location_geom=f"SRID=4326;POINT({item['lon']} {item['lat']})",
                address_text=item["address"],
                ward_id=wards[item["ward_idx"]].id,
                reporter_id=citizen_user.id if idx % 2 == 0 else citizen_two.id,
                is_anonymous=True if idx == 5 else False,
                priority_score=p_calc["score"],
                priority_breakdown=p_calc,
                resolution_notes=item.get("resolution_notes"),
                created_at=created_dt,
                updated_at=now - timedelta(hours=idx),
                verified_at=verified_dt,
                resolved_at=resolved_dt,
                closed_at=resolved_dt if item["status"] == IssueStatus.CLOSED else None
            )
            db.add(issue)
            created_issues.append(issue)

            if item.get("is_dup_of") is not None:
                dup_pairs_to_create.append((item["is_dup_of"], idx))

        db.commit()

        # Connect duplicates and assignments
        print("Linking duplicate pairs and assignments...")
        for can_idx, dup_idx in dup_pairs_to_create:
            can_issue = created_issues[can_idx]
            dup_issue = created_issues[dup_idx]
            
            dup_record = IssueDuplicate(
                canonical_issue_id=can_issue.id,
                duplicate_issue_id=dup_issue.id,
                confidence_score=92.5 if can_issue.category == dup_issue.category else 64.0,
                status="CONFIRMED" if dup_issue.status in [IssueStatus.ASSIGNED, IssueStatus.CLOSED] else "CANDIDATE",
                reviewed_by=officer_roads.id,
                reviewed_at=now - timedelta(days=1),
                created_at=dup_issue.created_at
            )
            db.add(dup_record)
            
            if dup_record.status == "CONFIRMED":
                dup_issue.canonical_issue_id = can_issue.id

        # Add assignments, timeline updates, sample comments, and photos
        for idx, item in enumerate(raw_issues):
            issue = created_issues[idx]
            created_dt = issue.created_at
            
            # Initial update
            upd1 = IssueUpdate(
                issue_id=issue.id,
                actor_id=issue.reporter_id,
                from_status=None,
                to_status=IssueStatus.SUBMITTED,
                note="Complaint logged via Civic Fix citizen app",
                created_at=created_dt
            )
            db.add(upd1)

            # Assignment if configured
            if item.get("assigned_team"):
                team = item["assigned_team"]
                user_assigned = item.get("assigned_user")
                assign_record = IssueAssignment(
                    issue_id=issue.id,
                    department_id=team.department_id,
                    team_id=team.id,
                    assigned_to_user_id=user_assigned.id if user_assigned else None,
                    assigned_by_user_id=officer_roads.id,
                    notes=f"Assigned priority task to {team.name}",
                    is_current=True,
                    assigned_at=created_dt + timedelta(hours=8)
                )
                db.add(assign_record)
                
                upd_assign = IssueUpdate(
                    issue_id=issue.id,
                    actor_id=officer_roads.id,
                    from_status=IssueStatus.VERIFIED,
                    to_status=IssueStatus.ASSIGNED,
                    note=f"Assigned to {team.name}",
                    created_at=created_dt + timedelta(hours=8)
                )
                db.add(upd_assign)

            if issue.status in [IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED, IssueStatus.CLOSED]:
                upd_prog = IssueUpdate(
                    issue_id=issue.id,
                    actor_id=worker_user.id,
                    from_status=IssueStatus.ASSIGNED,
                    to_status=IssueStatus.IN_PROGRESS,
                    note="Field crew arrived on site with materials and commenced repairs",
                    created_at=created_dt + timedelta(hours=14)
                )
                db.add(upd_prog)

            if issue.status in [IssueStatus.RESOLVED, IssueStatus.CLOSED]:
                upd_res = IssueUpdate(
                    issue_id=issue.id,
                    actor_id=worker_user.id,
                    from_status=IssueStatus.IN_PROGRESS,
                    to_status=IssueStatus.RESOLVED,
                    note=issue.resolution_notes or "Work completed and tested",
                    created_at=issue.resolved_at or (created_dt + timedelta(hours=28))
                )
                db.add(upd_res)

            # Sample comments
            if idx in [0, 3, 6, 10]:
                c1 = IssueComment(
                    issue_id=issue.id,
                    author_id=issue.reporter_id,
                    comment_text="Please fix this as soon as possible, school buses pass here daily!",
                    is_internal=False,
                    created_at=created_dt + timedelta(hours=2)
                )
                c2 = IssueComment(
                    issue_id=issue.id,
                    author_id=officer_roads.id,
                    comment_text="Inspection scheduled for this afternoon. Work team notified.",
                    is_internal=False,
                    created_at=created_dt + timedelta(hours=7)
                )
                c3 = IssueComment(
                    issue_id=issue.id,
                    author_id=officer_roads.id,
                    comment_text="[INTERNAL NOTE] Materials allocated from Kothrud central depot.",
                    is_internal=True,
                    created_at=created_dt + timedelta(hours=8)
                )
                db.add_all([c1, c2, c3])

            # Sample photos
            photo1 = IssuePhoto(
                issue_id=issue.id,
                photo_url="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80" if item["category"] == IssueCategory.POTHOLE else "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
                photo_type="REPORT",
                caption="Initial citizen report photo",
                uploaded_by=issue.reporter_id,
                created_at=created_dt
            )
            db.add(photo1)

            if issue.status in [IssueStatus.RESOLVED, IssueStatus.CLOSED]:
                photo_res = IssuePhoto(
                    issue_id=issue.id,
                    photo_url="https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80",
                    photo_type="RESOLUTION_EVIDENCE",
                    caption="Post-resolution inspection photo showing completed repair",
                    uploaded_by=worker_user.id,
                    created_at=issue.resolved_at or now
                )
                db.add(photo_res)

        # 6. Seed Saved Route
        print("Seeding sample inspection route...")
        sample_route = SavedRoute(
            name="FC Road & Deccan Monsoon Inspection Route",
            created_by=officer_roads.id,
            waypoints_geojson={
                "type": "FeatureCollection",
                "features": [
                    {"type": "Feature", "geometry": {"type": "Point", "coordinates": [73.8415, 18.5168]}, "properties": {"name": "Goodluck Chowk Pothole"}},
                    {"type": "Feature", "geometry": {"type": "Point", "coordinates": [73.8430, 18.5192]}, "properties": {"name": "FC College Choked Drain"}},
                    {"type": "Feature", "geometry": {"type": "Point", "coordinates": [73.8470, 18.5240]}, "properties": {"name": "Ghole Road Manhole"}}
                ]
            },
            total_distance_km=2.4
        )
        db.add(sample_route)

        # 7. Seed Notifications
        print("Seeding in-app notifications...")
        notif1 = Notification(
            user_id=citizen_user.id,
            title="Complaint Verified",
            message="Your complaint TKT-2026-0001 (FC Road Pothole) has been verified by Officer Anjali Deshmukh.",
            link="/my-complaints?id=" + created_issues[0].id,
            event_type="STATUS_UPDATE",
            created_at=now - timedelta(hours=5)
        )
        notif2 = Notification(
            user_id=citizen_user.id,
            title="Work In Progress",
            message="Field Lead Ramesh Jadhav has commenced repairs on TKT-2026-0001.",
            link="/my-complaints?id=" + created_issues[0].id,
            event_type="STATUS_UPDATE",
            created_at=now - timedelta(hours=1)
        )
        notif3 = Notification(
            user_id=officer_roads.id,
            title="Emergency Safety Issue Logged",
            message="Critical severity complaint TKT-2026-0004 (Main drinking water burst on JM Road) requires immediate review.",
            link="/map?id=" + created_issues[3].id,
            event_type="EMERGENCY_ISSUE",
            created_at=now - timedelta(hours=3)
        )
        db.add_all([notif1, notif2, notif3])

        db.commit()
        print("=== Database seeding completed successfully! ===")
        print("Demo Accounts:")
        print("  Citizen:   citizen@civicfix.org   / CivicFix2026!")
        print("  Officer:   officer@civicfix.org   / CivicFix2026!")
        print("  Worker:    worker@civicfix.org    / CivicFix2026!")
        print("  Admin:     admin@civicfix.org     / CivicFix2026!")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
