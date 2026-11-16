import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('check_docs', Path(__file__).with_name('check-docs.py'))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class DocumentationChecks(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.doc = self.root / 'guide.md'

    def check(self, text):
        self.doc.write_text(text)
        return checker.check_file(self.doc, self.root)

    def test_deleted_target_and_local_image(self):
        target = self.root / 'image.png'
        target.touch()
        self.assertEqual(self.check('![example](image.png)'), [])
        target.unlink()
        self.assertIn('missing local target', self.check('![example](image.png)')[0])

    def test_urls_anchors_and_encoded_paths(self):
        (self.root / 'my file.md').touch()
        self.assertEqual(self.check('[web](https://example.invalid/no-file) [mail](mailto:a@b.com) '
                                    '[anchor](#section) [local](my%20file.md#section) '
                                    '[root](/my%20file.md)'), [])

    def test_examples_and_matching_fences(self):
        self.assertEqual(self.check('`[example](missing.md)`\n````md\n[x](missing.md)\n```\n````\n'), [])
        self.assertIn('unclosed code fence', self.check('~~~md\nexample\n')[0])

    def test_reference_links_and_nested_parentheses(self):
        (self.root / 'file(1).md').touch()
        self.assertEqual(self.check('[file](file(1).md)\n[ref][ID]\n[ID]: <file(1).md>'), [])
        self.assertIn('missing local target', self.check('[ref][ID]\n[ID]: deleted.md')[0])
        self.assertIn('undefined link reference', self.check('[ref][missing]')[0])


if __name__ == '__main__':
    unittest.main()
