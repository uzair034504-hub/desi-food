import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import psycopg2

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import db


class DatabaseFallbackTests(unittest.TestCase):
    def setUp(self):
        db._reset_runtime_state()

    def test_create_and_list_conversations_fallback(self):
        with patch("db.psycopg2.connect", side_effect=psycopg2.OperationalError("boom")):
            result = db.create_conversation("user-1", "Test chat")
            self.assertEqual(result["title"], "Test chat")

            conversations = db.list_conversations("user-1")
            self.assertEqual(len(conversations), 1)
            self.assertEqual(conversations[0]["title"], "Test chat")


if __name__ == "__main__":
    unittest.main()
