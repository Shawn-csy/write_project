#!/usr/bin/env python3
"""Regression checks for the repository's deliberately simple CI YAML structure.

Uses only the standard library; rejects unexpected syntax instead of silently
accepting YAML constructs that this small contract reader cannot understand.
"""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = {
    "public-read-security": "Public read and security contracts",
    "submission-workflows": "Submission workflows",
}


def event_paths(source, event):
    match = re.search(rf"^  {event}:\n(.*?)(?=^  \w|^\S|\Z)", source, re.M | re.S)
    assert match, f"Missing {event} trigger"
    paths = re.search(r"^    paths:\n((?:      - '[^']+'\n)+)", match[1], re.M)
    assert paths, f"Missing explicit {event} paths"
    return re.findall(r"      - '([^']+)'", paths[1])


def path_matches(path, pattern):
    # GitHub's **/ includes zero directories; * never crosses a slash.
    translated = ''
    index = 0
    while index < len(pattern):
        if pattern[index:index + 3] == '**/':
            translated += '(?:.*/)?'
            index += 3
        elif pattern[index:index + 2] == '**':
            translated += '.*'
            index += 2
        elif pattern[index] == '*':
            translated += '[^/]*'
            index += 1
        elif pattern[index] == '?':
            translated += '[^/]'
            index += 1
        else:
            translated += re.escape(pattern[index])
            index += 1
    return re.fullmatch(translated, path) is not None


def triggered(changes, patterns):
    for path in changes:
        included = False
        for pattern in patterns:
            negative = pattern.startswith('!')
            if path_matches(path, pattern[1:] if negative else pattern):
                included = not negative
        if included:
            return True
    return False


def commands(source):
    # Require real, unconditional run steps inside jobs, not comments or labels.
    jobs = source.split("\njobs:\n", 1)[1]
    assert not re.search(r"^\s+(?:if:|continue-on-error:)", jobs, re.M), "CI gates must not be conditional or optional"
    return set(re.findall(r"^        run: ([^\n]+)$|^      - run: ([^\n]+)$", jobs, re.M))


class CIContracts(unittest.TestCase):
    def test_trigger_coverage_and_docs_exclusion(self):
        samples = [
            "src/main.tsx", "src/lib/example.ts", "packages/script-engine/src/index.ts",
            "apps/public/app/page.tsx", "server/main.py", "public/favicon.svg",
            "deploy/nginx/default.conf", "nginx.conf", ".dockerignore", "docker-compose.prod.yml",
            "docs/example.py", "docs/config.json", "scripts/release.sh", "scripts/deploy.sh", ".github/workflows/deploy.yml",
            ".github/workflows/public-read-security.yml", ".github/workflows/submission-workflows.yml",
            "package.json", "package-lock.json", "tsconfig.json", "vite.config.ts",
            "vitest.config.ts", "tailwind.config.ts", "postcss.config.ts", "index.html",
        ]
        all_paths = []
        for workflow in WORKFLOWS:
            source = (ROOT / f".github/workflows/{workflow}.yml").read_text()
            for event in ("push", "pull_request"):
                paths = event_paths(source, event)
                all_paths.append(paths)
                for sample in samples:
                    with self.subTest(workflow=workflow, event=event, path=sample):
                        self.assertTrue(triggered([sample], paths))
                for doc in ("README.md", "CHANGELOG.md", "docs/engineering/ci-process.md", "docs/product/guide.md", "apps/public/README.md", "packages/script-engine/README.md", "scripts/README.md"):
                    self.assertFalse(triggered([doc], paths))
                self.assertTrue(triggered(['apps/public/README.md', 'src/main.tsx'], paths))
                # For renames, conservatively model both old and new paths.
                self.assertTrue(triggered(['docs/old.md', 'docs/new.py'], paths))
                self.assertTrue(triggered(['src/old.ts', 'docs/new.md'], paths))
                self.assertFalse(triggered(['docs/old.md', 'docs/new.md'], paths))
                self.assertFalse(triggered(['LICENSE', 'notes.txt'], paths))
            self.assertRegex(source, r"(?m)^    branches: \[main\]$")
        self.assertTrue(all(p == all_paths[0] for p in all_paths), "Both deployment gates must cover the same changes")

    def test_ordered_patterns_and_documentation_workflow(self):
        self.assertTrue(path_matches('README.md', '**/*.md'))
        self.assertFalse(path_matches('a/b/c.md', 'a/*.md'))
        self.assertTrue(triggered(['a.md'], ['**', '!**/*.md', 'a.md']))
        self.assertFalse(triggered(['a.md'], ['**', 'a.md', '!**/*.md']))
        source = (ROOT / '.github/workflows/documentation.yml').read_text()
        for event in ('push', 'pull_request'):
            paths = event_paths(source, event)
            for path in ('README.md', 'CHANGELOG.md', 'apps/public/README.md',
                         'packages/example/README.md', 'scripts/README.md',
                         'docs/new.md', 'scripts/check-docs.py',
                         'scripts/test_check_docs.py', '.github/workflows/documentation.yml'):
                self.assertTrue(triggered([path], paths), path)
        actual = {a or b for a, b in commands(source)}
        self.assertIn('python3 scripts/check-docs.py', actual)
        self.assertIn("python3 -m unittest discover -s scripts -p 'test_check_docs.py'", actual)

    def test_required_gates_are_executable_steps(self):
        source = (ROOT / ".github/workflows/public-read-security.yml").read_text()
        actual = {a or b for a, b in commands(source)}
        for command in (
            "npm ci", "npm run typecheck", "npx vitest run --project main", "npm run build",
            "npx vitest run apps/public", "npx tsc --noEmit -p apps/public/tsconfig.json",
            "python3 scripts/check-public-builds.py", "python3 scripts/check-ci-contracts.py",
            "python3 scripts/check-prod-network-boundary.py", "python -m pytest -q tests",
            "RUN_NGINX_INTEGRATION=1 python3 -m unittest discover -s scripts -p 'test_site_release_nginx.py'",
        ):
            self.assertIn(command, actual)
        submissions = (ROOT / ".github/workflows/submission-workflows.yml").read_text()
        self.assertTrue(any("test_submission_workflow_contract.py" in (a or b) for a, b in commands(submissions)))
        self.assertTrue(any("SubmissionDialogs.test.tsx" in (a or b) for a, b in commands(submissions)))
        build_check = (ROOT / "scripts/check-public-builds.py").read_text()
        self.assertNotIn('["npm", "run", "build", "-w", "apps/public"]', build_check)
        self.assertIn('"scripts/build-public-pages.mjs"', build_check)

    def test_deployment_gate_names_remain_compatible(self):
        deploy = (ROOT / ".github/workflows/deploy.yml").read_text()
        release = (ROOT / "scripts/release-workflow.py").read_text()
        for workflow, name in WORKFLOWS.items():
            source = (ROOT / f".github/workflows/{workflow}.yml").read_text()
            self.assertEqual(source.splitlines()[0], f"name: {name}")
            self.assertIn(f'"{name}"', deploy)
            self.assertIn(repr(name), release)
        self.assertIn("github.event.workflow_run.conclusion == 'success'", deploy)
        self.assertIn("github.event.workflow_run.head_branch == 'main'", deploy)
        self.assertIn("ref: ${{ github.event_name == 'workflow_run' && github.event.workflow_run.head_sha || github.sha }}", deploy)
        self.assertNotIn('ref: main', deploy)
        self.assertNotIn('${{ github.event.workflow_run.head_sha }}', deploy)
        self.assertIn("github.event.workflow_run.event == 'push'", deploy)
        self.assertIn("github.event.workflow_run.head_repository.full_name == github.repository", deploy)


if __name__ == "__main__":
    unittest.main()
