import unittest

from sync_engine import align_segments, group_segments


class AlignmentTests(unittest.TestCase):
    def test_groups_short_transcript_segments(self):
        segments = [{"start": 0, "end": 10, "text": "Guten Morgen"}, {"start": 10, "end": 25, "text": "einen Kaffee bitte"}]
        self.assertEqual(group_segments(segments), [{"start": 0.0, "end": 25.0, "text": "Guten Morgen einen Kaffee bitte"}])

    def test_matches_bilingual_non_contiguous_pages(self):
        pages = ["Der Bahnhof ist heute geschlossen.", "Unrelated introduction.", "Ich hätte gern einen Kaffee, bitte."]
        segments = [
            {"start": 0, "end": 25, "text": "Ich hätte gern einen Kaffee bitte"},
            {"start": 25, "end": 51, "text": "Der Bahnhof ist heute geschlossen"},
        ]
        matches = align_segments(pages, segments)
        self.assertEqual([match["page"] for match in matches], [3, 1])
        self.assertGreater(matches[0]["confidence"], 0.8)

    def test_ignores_unmatched_audio(self):
        self.assertEqual(align_segments(["Hallo Welt"], [{"start": 0, "end": 25, "text": "completely different narration"}]), [])


if __name__ == "__main__":
    unittest.main()
