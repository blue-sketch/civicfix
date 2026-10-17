import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User, UserRole
from app.models.issue import Issue, IssueStatus, IssueCategory, IssueSeverity
from app.services.priority_engine import calculate_priority_score
from app.services.duplicate_detection import calculate_text_similarity

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "Civic Fix"

def test_login_demo_users():
    # 1. Login citizen
    res_cit = client.post("/api/v1/auth/login", json={
        "email": "citizen@civicfix.org",
        "password": "CivicFix2026!"
    })
    assert res_cit.status_code == 200
    data_cit = res_cit.json()
    assert "access_token" in data_cit
    assert data_cit["user"]["role"] == "CITIZEN"

    # 2. Login officer
    res_off = client.post("/api/v1/auth/login", json={
        "email": "officer@civicfix.org",
        "password": "CivicFix2026!"
    })
    assert res_off.status_code == 200
    assert res_off.json()["user"]["role"] == "MUNICIPAL_OFFICER"

    # 3. Login admin
    res_adm = client.post("/api/v1/auth/login", json={
        "email": "admin@civicfix.org",
        "password": "CivicFix2026!"
    })
    assert res_adm.status_code == 200
    assert res_adm.json()["user"]["role"] == "ADMIN"

def test_invalid_login():
    res = client.post("/api/v1/auth/login", json={
        "email": "citizen@civicfix.org",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401

def test_priority_engine_math():
    now = datetime.now(timezone.utc)
    result = calculate_priority_score(
        severity="CRITICAL",
        category="POTHOLE",
        created_at=now,
        corroboration_count=1,
        is_resolved=False
    )
    assert result["score"] >= 58.0
    assert result["band"] == "CRITICAL"
    assert result["is_emergency"] is True
    assert result["breakdown"]["weights"]["severity"] == 0.35

def test_text_similarity():
    s1 = "Deep pothole near Goodluck Cafe FC Road"
    s2 = "FC Road deep pothole near cafe"
    sim = calculate_text_similarity(s1, s2)
    assert sim >= 0.5

    s3 = "Overflowing green garbage bin with plastic waste"
    sim_unrelated = calculate_text_similarity(s1, s3)
    assert sim_unrelated == 0.0

def test_citizen_data_isolation():
    # Citizen 1 logs in
    res_cit = client.post("/api/v1/auth/login", json={
        "email": "citizen@civicfix.org",
        "password": "CivicFix2026!"
    })
    cit_token = res_cit.json()["access_token"]
    cit_user_id = res_cit.json()["user"]["id"]

    # Citizen 2 logs in
    res_cit2 = client.post("/api/v1/auth/login", json={
        "email": "citizen2@civicfix.org",
        "password": "CivicFix2026!"
    })
    cit2_token = res_cit2.json()["access_token"]

    # Citizen 2 creates a private complaint
    create_res = client.post(
        "/api/v1/issues",
        json={
            "title": "Private Citizen 2 grievance",
            "description": "Exposed high voltage wire in building alleyway.",
            "category": "STREETLIGHT",
            "severity": "CRITICAL",
            "latitude": 18.5200,
            "longitude": 73.8500
        },
        headers={"Authorization": f"Bearer {cit2_token}"}
    )
    assert create_res.status_code == 201
    cit2_issue_id = create_res.json()["id"]

    # Citizen 1 tries to access Citizen 2's complaint detail -> MUST BE 404
    hack_res = client.get(
        f"/api/v1/issues/{cit2_issue_id}",
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert hack_res.status_code == 404

    # Citizen 1 lists issues -> MUST only receive their own complaints
    list_res = client.get(
        "/api/v1/issues",
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    for item in items:
        assert item["reporter_id"] == cit_user_id

def test_officer_cannot_verify_or_assign():
    # Login officer
    res_off = client.post("/api/v1/auth/login", json={
        "email": "officer@civicfix.org",
        "password": "CivicFix2026!"
    })
    off_token = res_off.json()["access_token"]

    # Login admin to find an issue
    res_adm = client.post("/api/v1/auth/login", json={
        "email": "admin@civicfix.org",
        "password": "CivicFix2026!"
    })
    adm_token = res_adm.json()["access_token"]
    issues = client.get("/api/v1/issues?page=1&page_size=1", headers={"Authorization": f"Bearer {adm_token}"}).json()["items"]
    issue_id = issues[0]["id"]

    # Officer attempts verify -> MUST BE 403 Forbidden
    res_verify = client.post(
        f"/api/v1/issues/{issue_id}/verify",
        headers={"Authorization": f"Bearer {off_token}"}
    )
    assert res_verify.status_code == 403

    # Officer attempts assign -> MUST BE 403 Forbidden
    res_assign = client.post(
        f"/api/v1/issues/{issue_id}/assign",
        json={"notes": "Illegal assignment attempt by officer"},
        headers={"Authorization": f"Bearer {off_token}"}
    )
    assert res_assign.status_code == 403

def test_admin_verifies_and_assigns_and_officer_workflow():
    # Login admin
    res_adm = client.post("/api/v1/auth/login", json={
        "email": "admin@civicfix.org",
        "password": "CivicFix2026!"
    })
    adm_token = res_adm.json()["access_token"]

    # Login officer (Roads & Infrastructure)
    res_off = client.post("/api/v1/auth/login", json={
        "email": "officer@civicfix.org",
        "password": "CivicFix2026!"
    })
    off_token = res_off.json()["access_token"]
    roads_dept_id = res_off.json()["user"]["department_id"]

    # Citizen creates road pothole
    res_cit = client.post("/api/v1/auth/login", json={
        "email": "citizen@civicfix.org",
        "password": "CivicFix2026!"
    })
    cit_token = res_cit.json()["access_token"]

    create_res = client.post(
        "/api/v1/issues",
        json={
            "title": "Severe road cavity near Deccan",
            "description": "Cavity opened up after heavy monsoon showers.",
            "category": "POTHOLE",
            "severity": "HIGH",
            "latitude": 18.5165,
            "longitude": 73.8410
        },
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert create_res.status_code == 201
    issue_id = create_res.json()["id"]

    # 1. Admin verifies issue
    verify_res = client.post(
        f"/api/v1/issues/{issue_id}/verify",
        headers={"Authorization": f"Bearer {adm_token}"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"

    # 2. Admin assigns team & department
    assign_res = client.post(
        f"/api/v1/issues/{issue_id}/assign",
        json={"department_id": roads_dept_id, "notes": "Dispatched to Road Rapid Patch Unit"},
        headers={"Authorization": f"Bearer {adm_token}"}
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "ASSIGNED"

    # 3. Officer starts work -> IN_PROGRESS
    start_res = client.post(
        f"/api/v1/issues/{issue_id}/status",
        json={"status": "IN_PROGRESS", "note": "Crew on site with asphalt roller"},
        headers={"Authorization": f"Bearer {off_token}"}
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "IN_PROGRESS"

    # 4. Officer resolves issue -> RESOLVED
    resolve_res = client.post(
        f"/api/v1/issues/{issue_id}/resolve",
        data={"resolution_notes": "Cavity filled and compacted. Road surface smooth."},
        headers={"Authorization": f"Bearer {off_token}"}
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"

    # 5. Officer certifies issue -> CERTIFIED
    certify_res = client.post(
        f"/api/v1/issues/{issue_id}/certify",
        json={"notes": "Field supervisor quality inspection passed"},
        headers={"Authorization": f"Bearer {off_token}"}
    )
    assert certify_res.status_code == 200
    assert certify_res.json()["status"] == "CERTIFIED"
    assert certify_res.json()["certified_at"] is not None

def test_department_scoped_analytics():
    # Login officer
    res_off = client.post("/api/v1/auth/login", json={
        "email": "officer@civicfix.org",
        "password": "CivicFix2026!"
    })
    off_token = res_off.json()["access_token"]

    # Login citizen
    res_cit = client.post("/api/v1/auth/login", json={
        "email": "citizen@civicfix.org",
        "password": "CivicFix2026!"
    })
    cit_token = res_cit.json()["access_token"]

    # Citizen accessing analytics -> MUST BE 403 Forbidden
    cit_res = client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {cit_token}"})
    assert cit_res.status_code == 403

    # Officer accessing analytics -> Scoped to department
    off_res = client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {off_token}"})
    assert off_res.status_code == 200
    ov = off_res.json()
    assert "total_reports" in ov
    assert "open_issues" in ov

def test_map_issues_viewport():
    res = client.get("/api/v1/issues/map?min_lat=18.48&max_lat=18.58&min_lon=73.79&max_lon=73.95")
    assert res.status_code == 200
    markers = res.json()
    assert len(markers) >= 30
    assert "latitude" in markers[0]
    assert "priority_score" in markers[0]
