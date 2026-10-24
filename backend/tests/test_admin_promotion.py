from fastapi.testclient import TestClient
from app.main import app
from app.db.database import upsert_user, UserRecord, get_user_by_id, delete_user

client = TestClient(app)

def test_admin_promotion_and_demotion():
    # 1. Setup a test viewer user
    viewer = UserRecord(
        id="test-google-viewer-101",
        email="test.officer.candidate@gmail.com",
        full_name="Candidate Officer",
        badge_number="GOOG-CAND",
        department="Forensic Intake",
        role="viewer",
        is_active=True,
        avatar_url=None,
        provider="google",
        last_active_at="2026-10-23T20:00:00Z",
        created_at="2026-10-23T20:00:00Z",
        updated_at="2026-10-23T20:00:00Z"
    )
    upsert_user(viewer)

    try:
        # 2. Promote to Officer
        resp = client.post(
            f"/api/admin/users/{viewer.id}/role",
            json={"role": "officer"}
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["role"] == "officer"
        assert get_user_by_id(viewer.id).role == "officer"

        # 3. Demote back to Viewer
        resp_demote = client.post(
            f"/api/admin/users/{viewer.id}/role",
            json={"role": "viewer"}
        )
        assert resp_demote.status_code == 200
        assert resp_demote.json()["role"] == "viewer"
        assert get_user_by_id(viewer.id).role == "viewer"
    finally:
        delete_user(viewer.id)

def test_promotion_to_admin_strictly_prohibited():
    viewer = UserRecord(
        id="test-google-viewer-102",
        email="unauthorized.admin.candidate@gmail.com",
        full_name="Unauthorized Admin Candidate",
        badge_number="GOOG-UNAUTH",
        department="Forensics",
        role="viewer",
        is_active=True,
        avatar_url=None,
        provider="google",
        last_active_at="2026-10-23T20:00:00Z",
        created_at="2026-10-23T20:00:00Z",
        updated_at="2026-10-23T20:00:00Z"
    )
    upsert_user(viewer)

    try:
        # Attempt to promote to admin
        resp = client.post(
            f"/api/admin/users/{viewer.id}/role",
            json={"role": "admin"}
        )
        assert resp.status_code == 400
        assert "strictly prohibited" in resp.json()["detail"].lower()
        # Confirm role was not altered
        assert get_user_by_id(viewer.id).role == "viewer"
    finally:
        delete_user(viewer.id)

def test_invalid_role_rejected():
    viewer = UserRecord(
        id="test-google-viewer-103",
        email="invalid.role@gmail.com",
        full_name="Invalid Role Test",
        badge_number="GOOG-INVAL",
        department="Forensics",
        role="viewer",
        is_active=True,
        avatar_url=None,
        provider="google",
        last_active_at="2026-10-23T20:00:00Z",
        created_at="2026-10-23T20:00:00Z",
        updated_at="2026-10-23T20:00:00Z"
    )
    upsert_user(viewer)

    try:
        resp = client.post(
            f"/api/admin/users/{viewer.id}/role",
            json={"role": "superadmin"}
        )
        assert resp.status_code == 400
        assert "invalid role" in resp.json()["detail"].lower()
    finally:
        delete_user(viewer.id)

def test_delete_user_and_protect_admin():
    # 1. Non-admin user deletion succeeds
    user_to_delete = UserRecord(
        id="test-google-to-delete",
        email="temporary.candidate@gmail.com",
        full_name="Temporary Candidate",
        badge_number="GOOG-TEMP",
        department="Forensic Intern",
        role="viewer",
        is_active=True,
        avatar_url=None,
        provider="google",
        last_active_at="2026-10-23T20:00:00Z",
        created_at="2026-10-23T20:00:00Z",
        updated_at="2026-10-23T20:00:00Z"
    )
    upsert_user(user_to_delete)

    try:
        resp_del = client.delete(f"/api/admin/users/{user_to_delete.id}")
        assert resp_del.status_code == 200, resp_del.text
        assert resp_del.json()["deleted_id"] == user_to_delete.id
        assert get_user_by_id(user_to_delete.id) is None
    finally:
        delete_user(user_to_delete.id)

    # 2. Deleting an admin account is strictly rejected
    admin_user = get_user_by_id("0b885f91-6a4a-4472-80da-2e26c3c89adc")
    if admin_user:
        resp_admin_del = client.delete(f"/api/admin/users/{admin_user.id}")
        assert resp_admin_del.status_code == 400
        assert "cannot delete" in resp_admin_del.json()["detail"].lower()

