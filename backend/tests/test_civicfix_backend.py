import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, get_db
from app.core.config import settings
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

def test_invalid_login():
    res = client.post("/api/v1/auth/login", json={
        "email": "citizen@civicfix.org",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401

def test_priority_engine_math():
    now = datetime.now(timezone.utc)
    # Test Critical pothole
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
    assert "breakdown" in result
    assert result["breakdown"]["weights"]["severity"] == 0.35

    # Test Low road crack resolved
    res_low = calculate_priority_score(
        severity="LOW",
        category="ROAD_CRACK",
        created_at=now,
        corroboration_count=1,
        is_resolved=True
    )
    assert res_low["score"] <= 35.0
    assert res_low["band"] == "LOW"

def test_text_similarity():
    s1 = "Deep pothole near Goodluck Cafe FC Road"
    s2 = "FC Road deep pothole near cafe"
    sim = calculate_text_similarity(s1, s2)
    assert sim >= 0.5

    s3 = "Overflowing green garbage bin with plastic waste"
    sim_unrelated = calculate_text_similarity(s1, s3)
    assert sim_unrelated == 0.0

def test_issues_listing_and_pagination():
    res = client.get("/api/v1/issues?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 30
    assert len(data["items"]) == 10
    assert "ticket_id" in data["items"][0]

def test_map_issues_viewport():
    res = client.get("/api/v1/issues/map?min_lat=18.48&max_lat=18.58&min_lon=73.79&max_lon=73.95")
    assert res.status_code == 200
    markers = res.json()
    assert len(markers) >= 30
    assert "latitude" in markers[0]
    assert "priority_score" in markers[0]

def test_analytics_endpoints():
    res = client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    ov = res.json()
    assert ov["total_reports"] >= 30
    assert ov["open_issues"] > 0
    assert "avg_resolution_hours" in ov

    res_cat = client.get("/api/v1/analytics/categories")
    assert res_cat.status_code == 200
    cats = res_cat.json()
    assert len(cats) > 0
    assert any(c["category"] == "POTHOLE" for c in cats)

def test_citizen_cannot_verify_issue():
    # Login citizen
    res_cit = client.post("/api/v1/auth/login", json={
        "email": "citizen@civicfix.org",
        "password": "CivicFix2026!"
    })
    token = res_cit.json()["access_token"]
    
    # Get any issue
    issues = client.get("/api/v1/issues?page=1&page_size=1").json()["items"]
    issue_id = issues[0]["id"]

    # Attempt verify (officer only)
    res_verify = client.post(
        f"/api/v1/issues/{issue_id}/verify",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_verify.status_code == 403

def test_officer_workflow_and_assignment():
    # Login officer
    res_off = client.post("/api/v1/auth/login", json={
        "email": "officer@civicfix.org",
        "password": "CivicFix2026!"
    })
    off_token = res_off.json()["access_token"]

    # Create new complaint as citizen
    res_cit = client.post("/api/v1/auth/login", json={
        "email": "citizen@civicfix.org",
        "password": "CivicFix2026!"
    })
    cit_token = res_cit.json()["access_token"]

    new_issue_payload = {
        "title": "Severe road cavity near Deccan bus stop",
        "description": "Cavity opened up after rain near Deccan bus depot.",
        "category": "POTHOLE",
        "severity": "HIGH",
        "latitude": 18.5165,
        "longitude": 73.8410,
        "address_text": "Deccan Bus Station",
        "is_anonymous": False
    }
    create_res = client.post(
        "/api/v1/issues",
        json=new_issue_payload,
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert create_res.status_code == 201
    created_issue = create_res.json()
    tkt_id = created_issue["ticket_id"]
    issue_id = created_issue["id"]
    assert created_issue["status"] == "SUBMITTED"

    # Officer verifies complaint
    verify_res = client.post(
        f"/api/v1/issues/{issue_id}/verify",
        headers={"Authorization": f"Bearer {off_token}"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"

    # Officer assigns team
    assign_res = client.post(
        f"/api/v1/issues/{issue_id}/assign",
        json={"notes": "Assigning to Road Rapid Team"},
        headers={"Authorization": f"Bearer {off_token}"}
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "ASSIGNED"

    # Progress to IN_PROGRESS
    prog_res = client.post(
        f"/api/v1/issues/{issue_id}/status",
        json={"status": "IN_PROGRESS", "note": "Workers on site with bitumen asphalt"},
        headers={"Authorization": f"Bearer {off_token}"}
    )
    assert prog_res.status_code == 200
    assert prog_res.json()["status"] == "IN_PROGRESS"

    # Resolve issue
    resolve_res = client.post(
        f"/api/v1/issues/{issue_id}/resolve",
        data={"resolution_notes": "Bitumen patch completed and rolled flat."},
        headers={"Authorization": f"Bearer {off_token}"}
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"
    assert resolve_res.json()["resolution_notes"] == "Bitumen patch completed and rolled flat."
