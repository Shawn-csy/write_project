"""Safety contracts for the site-only release controller."""

import importlib.util
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("site_release", Path(__file__).with_name("site-release.py"))
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


class SiteReleaseTests(unittest.TestCase):
    def test_config_replaces_only_the_two_upstreams(self):
        original = 'set $backend "old-api";\nset $public "old-public";\nreturn 200 "ok";\n'
        result = site.config_for(original, "new-api", "new-public")
        self.assertEqual(result, 'set $backend "new-api";\nset $public "new-public";\nreturn 200 "ok";\n')

    def test_ambiguous_upstreams_are_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "one \\$backend"):
            site.config_for('set $backend "a";\nset $backend "b";\nset $public "p";', "c", "q")

    def test_release_tag_cannot_escape_release_root(self):
        for tag in ("../other", "bad.name", "UPPER", "a" * 41):
            with self.subTest(tag=tag), self.assertRaises(RuntimeError):
                site.release(tag)
        artifact, _ = site.release("valid-123")
        self.assertEqual(artifact, site.ROOT / "releases" / "valid-123")
        self.assertFalse(site.state_path(artifact).is_relative_to(artifact))

    def test_ingress_requires_one_dual_loopback_binding(self):
        def item(name, bindings):
            return {"Name": "/" + name, "HostConfig": {"PortBindings": {"80/tcp": bindings}}}

        safe = item("safe", [{"HostIp": "127.0.0.1", "HostPort": "1090"},
                             {"HostIp": "::1", "HostPort": "1090"}])
        public = item("public", [{"HostIp": "0.0.0.0", "HostPort": "1090"}])
        with patch.object(site, "docker", return_value=SimpleNamespace(stdout="safe\npublic\n")), \
             patch.object(site, "inspect", side_effect={"safe": safe, "public": public}.get):
            self.assertIs(site.ingress(), safe)
        with patch.object(site, "docker", return_value=SimpleNamespace(stdout="public\n")), \
             patch.object(site, "inspect", return_value=public):
            with self.assertRaisesRegex(RuntimeError, "dual-loopback"):
                site.ingress()

    def test_snapshot_digest_detects_mutation_and_rejects_symlinks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "index.html").write_text("first")
            before = site.snapshot_digest(root)
            (root / "index.html").write_text("second")
            self.assertNotEqual(before, site.snapshot_digest(root))
            (root / "outside").symlink_to("/etc/passwd")
            with self.assertRaisesRegex(RuntimeError, "symlink"):
                site.snapshot_digest(root)

    def test_preview_retries_unreachable_ipv4_binding(self):
        health_checks = []

        def fake_code(base, route, timeout=15):
            health_checks.append(base)
            if len(health_checks) <= 5:
                raise TimeoutError("preview IPv4 port did not accept connections")
            return 200

        with patch.object(site, "docker") as docker, \
             patch.object(site, "port", return_value=33001), \
             patch.object(site, "code", side_effect=fake_code), \
             patch.object(site, "stop_remove") as stop_remove, \
             patch.object(site.time, "sleep"):
            site.edge("preview", Path("/config"), Path("/static"), "preview-alias")

        self.assertEqual(docker.call_count, 2)
        stop_remove.assert_called_once_with("preview")
        self.assertEqual(health_checks[-2:], ["http://127.0.0.1:33001", "http://[::1]:33001"])

    def test_fixed_ingress_is_never_retried_before_activation_probe(self):
        with patch.object(site, "docker") as docker, patch.object(site, "port") as port:
            site.edge("live", Path("/config"), Path("/static"), "live-alias", fixed=True)
        docker.assert_called_once()
        port.assert_not_called()

    def test_rsc_cache_gate_uses_isolated_preview(self):
        with patch.object(site, "port", return_value=33229), patch.object(site, "command") as command:
            site.probe_rsc_cache_boundary("candidate")
        command.assert_called_once_with(
            site.sys.executable, str(site.ROOT / "scripts" / "check-rsc-cache-boundary.py"),
            "--base-url", "http://127.0.0.1:33229", "--sample-sitemap",
        )

    def test_retirement_keeps_live_and_immediate_rollback_services(self):
        states = {
            "live-edge": {"previous_edge": "prior-edge", "previous_api": "prior-api", "previous_public": "prior-public"},
            "prior-edge": {"previous_edge": "older-edge", "previous_api": "older-api", "previous_public": "older-public"},
            "older-edge": {"previous_edge": "legacy-edge", "previous_api": "legacy-api", "previous_public": "legacy-public"},
        }
        self.assertEqual(site.retired_ancestor_services("live-edge", states), [
            ("older-edge", "older-api", "older-public"),
            ("legacy-edge", "legacy-api", "legacy-public"),
        ])

    def test_retired_triplet_allows_complete_prune_but_rejects_partial_prune(self):
        with patch.object(site, "inspect", return_value=None):
            self.assertFalse(site.retired_triplet_present("old-edge", "old-api", "old-public", set()))
        with patch.object(site, "inspect", side_effect=lambda name: {"Name": name} if name == "old-edge" else None):
            with self.assertRaisesRegex(RuntimeError, "partially missing"):
                site.retired_triplet_present("old-edge", "old-api", "old-public", set())
        with self.assertRaisesRegex(RuntimeError, "overlap"):
            site.retired_triplet_present("old-edge", "live-api", "old-public", {"live-api"})

    def test_rollback_restarts_retired_previous_services_before_switching(self):
        target = {"edge": "live-edge", "old-check": "preview-edge"}
        state = {
            "previous_edge": "prior-edge", "previous_edge_id": "old-id",
            "previous_api": "prior-api", "previous_public": "prior-public",
            "previous_static": "/unused/static", "previous_config": "/unused/config",
            "previous_digest": "same", "baseline": {"/": 200},
        }
        running = {"live-edge": True, "prior-edge": False, "prior-api": False, "prior-public": False}
        events = []

        def fake_docker(*args, **_kwargs):
            events.append(args)
            if args[0] == "start":
                running[args[1]] = True
            elif args[0] == "stop":
                running[args[-1]] = False
            return SimpleNamespace(returncode=0)

        with patch.object(site, "state_and_names", return_value=(Path("/unused"), target, state)), \
             patch.object(site, "ingress", return_value={"Name": "/live-edge"}), \
             patch.object(site, "inspect", side_effect=lambda name: None if name == "preview-edge" else ({"Id": "old-id", "State": {"Running": False}} if name == "prior-edge" else {"Name": name})), \
             patch.object(site, "running", side_effect=lambda name: running.get(name, False)), \
             patch.object(site, "snapshot_digest", return_value="same"), \
             patch.object(site, "docker", side_effect=fake_docker), \
             patch.object(site, "wait_service", side_effect=lambda name, role: events.append(("ready", name, role))), \
             patch.object(site, "edge", side_effect=lambda *_args: events.append(("preview",))), \
             patch.object(site, "probe"), \
             patch.object(site, "stop_remove"):
            site.rollback("live")

        self.assertLess(events.index(("ready", "prior-api", "api")), events.index(("preview",)))
        self.assertLess(events.index(("ready", "prior-public", "public")), events.index(("preview",)))
        self.assertTrue(running["prior-edge"])
        self.assertFalse(running["live-edge"])


if __name__ == "__main__":
    unittest.main()
