import unittest

import main


class PasswordHashingTest(unittest.TestCase):
    def test_long_password_is_safe_for_bcrypt(self):
        long_password = "a" * 100
        normalized = main.normalize_password(long_password)
        hashed = main.pwd_context.hash(normalized)
        self.assertTrue(main.pwd_context.verify(normalized, hashed))


if __name__ == "__main__":
    unittest.main()
