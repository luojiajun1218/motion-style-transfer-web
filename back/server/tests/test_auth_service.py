import unittest

from back.server.services.auth_service import AuthService


class AuthServiceTests(unittest.TestCase):
    def test_rejects_invalid_email_when_requesting_code(self):
        service = AuthService(code_ttl_seconds=300)

        with self.assertRaises(ValueError):
            service.request_code("not-an-email")

    def test_verifies_requested_code_and_consumes_it_once(self):
        service = AuthService(code_ttl_seconds=300)

        request = service.request_code("User@Example.COM")
        session = service.verify_code("user@example.com", request.code)

        self.assertEqual(session.email, "user@example.com")
        self.assertTrue(service.validate_session(session.token))
        self.assertFalse(service.verify_code("user@example.com", request.code))

    def test_rejects_expired_code(self):
        now = 1000.0
        service = AuthService(code_ttl_seconds=60, clock=lambda: now)

        request = service.request_code("user@example.com")
        service.clock = lambda: now + 61

        self.assertFalse(service.verify_code("user@example.com", request.code))

    def test_blocks_immediate_code_resend(self):
        service = AuthService(code_ttl_seconds=300, resend_cooldown_seconds=30)

        service.request_code("user@example.com")

        with self.assertRaises(ValueError):
            service.request_code("user@example.com")

    def test_locks_code_after_too_many_failed_attempts(self):
        service = AuthService(code_ttl_seconds=300, max_verify_attempts=3)
        request = service.request_code("user@example.com")

        self.assertFalse(service.verify_code("user@example.com", "000000"))
        self.assertFalse(service.verify_code("user@example.com", "111111"))
        self.assertFalse(service.verify_code("user@example.com", "222222"))

        self.assertFalse(service.verify_code("user@example.com", request.code))


if __name__ == "__main__":
    unittest.main()
