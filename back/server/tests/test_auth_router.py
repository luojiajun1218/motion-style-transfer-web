import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from back.server.routers.auth import auth_service, router
from back.server.routers.bvh import router as bvh_router
from back.server.routers.preset import router as preset_router


class AuthRouterTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(router)
        app.include_router(bvh_router)
        app.include_router(preset_router)
        self.client = TestClient(app)

    def test_email_code_login_flow(self):
        with patch.dict("os.environ", {"AUTH_DEBUG_CODES": "1"}, clear=False):
            code_response = self.client.post("/api/auth/request-code", json={"email": "user@example.com"})

        self.assertEqual(code_response.status_code, 200)
        code = code_response.json()["debug_code"]
        self.assertEqual(len(code), 6)

        login_response = self.client.post(
            "/api/auth/verify-code",
            json={"email": "user@example.com", "code": code},
        )

        self.assertEqual(login_response.status_code, 200)
        token = login_response.json()["token"]

        session_response = self.client.get(
            "/api/auth/session",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(session_response.status_code, 200)
        self.assertEqual(session_response.json()["email"], "user@example.com")

        logout_response = self.client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(logout_response.status_code, 200)

        expired_session_response = self.client.get(
            "/api/auth/session",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(expired_session_response.status_code, 401)

    def test_does_not_return_debug_code_by_default(self):
        code_response = self.client.post("/api/auth/request-code", json={"email": "hidden@example.com"})

        self.assertEqual(code_response.status_code, 200)
        self.assertIsNone(code_response.json()["debug_code"])

    def test_workbench_routes_require_authentication(self):
        upload_response = self.client.post(
            "/api/upload",
            files={"file": ("walk.bvh", b"HIERARCHY\n", "application/octet-stream")},
        )
        preset_response = self.client.get("/api/preset/styles")

        self.assertEqual(upload_response.status_code, 401)
        self.assertEqual(preset_response.status_code, 401)

    def test_authenticated_upload_is_allowed(self):
        session = auth_service.verify_code(
            "upload@example.com",
            auth_service.request_code("upload@example.com").code,
        )

        upload_response = self.client.post(
            "/api/upload",
            files={"file": ("walk.bvh", b"HIERARCHY\n", "application/octet-stream")},
            headers={"Authorization": f"Bearer {session.token}"},
        )

        self.assertEqual(upload_response.status_code, 200)

    def test_query_token_is_not_accepted_for_file_access(self):
        session = auth_service.verify_code(
            "query-token@example.com",
            auth_service.request_code("query-token@example.com").code,
        )

        upload_response = self.client.post(
            "/api/upload",
            files={"file": ("walk.bvh", b"HIERARCHY\n", "application/octet-stream")},
            headers={"Authorization": f"Bearer {session.token}"},
        )
        file_id = upload_response.json()["id"]

        file_response = self.client.get(f"/api/file/{file_id}?token={session.token}")

        self.assertEqual(file_response.status_code, 401)

    def test_temporary_login_token_requires_explicit_environment_flag(self):
        upload_response = self.client.post(
            "/api/upload",
            files={"file": ("walk.bvh", b"HIERARCHY\n", "application/octet-stream")},
            headers={"Authorization": "Bearer temporary-login:demo-user:12345"},
        )

        self.assertEqual(upload_response.status_code, 401)

        with patch.dict("os.environ", {"AUTH_TEMPORARY_LOGIN": "1"}, clear=False):
            upload_response = self.client.post(
                "/api/upload",
                files={"file": ("walk.bvh", b"HIERARCHY\n", "application/octet-stream")},
                headers={"Authorization": "Bearer temporary-login:demo-user:12345"},
            )

        self.assertEqual(upload_response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
