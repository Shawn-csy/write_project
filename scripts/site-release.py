#!/usr/bin/env python3
"""Release only this site's loopback ingress; leave PostgreSQL and other services running."""

import argparse
import fcntl
import hashlib
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
# Durable release files are mounted by the live ingress, so they live in one
# fixed place even when this script runs from another checkout (the deploy runner).
RELEASE_ROOT = Path(os.environ.get("WP_RELEASE_ROOT") or ROOT / "releases").resolve()
CONTROL_ROOT = RELEASE_ROOT / ".site-release"
NETWORK = "write_project_default"
ROUTES = ("/healthz", "/api/health/ready", "/api/public-bundle", "/", "/authors", "/audio-works", "/voice-actors", "/activities", "/demos", "/resources", "/help", "/license", "/login", "/studio/demos")
ORIGIN = "http://127.0.0.1:1090"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect)


def command(*args, check=True):
    result = subprocess.run(args, text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(f"{args[0]} {args[1]} failed: {result.stderr.strip()}")
    return result


def docker(*args, check=True):
    return command("docker", *args, check=check)


def inspect(name):
    result = docker("inspect", name, check=False)
    return json.loads(result.stdout)[0] if result.returncode == 0 else None


def running(name):
    item = inspect(name)
    return bool(item and item["State"]["Running"])


def mount(item, destination):
    matches = [part for part in item["Mounts"] if part["Destination"] == destination]
    if len(matches) != 1 or matches[0]["Type"] != "bind":
        raise RuntimeError(f"expected one bind mount at {destination}")
    return Path(matches[0]["Source"])


def ingress():
    names = docker("ps", "--filter", "publish=1090", "--format", "{{.Names}}").stdout.splitlines()
    matches = []
    for name in names:
        item = inspect(name)
        bindings = item["HostConfig"]["PortBindings"].get("80/tcp", [])
        endpoints = {(binding["HostIp"], binding["HostPort"]) for binding in bindings}
        if endpoints == {("127.0.0.1", "1090"), ("::1", "1090")}:
            matches.append(item)
    if len(matches) != 1:
        raise RuntimeError(f"expected one dual-loopback site ingress on 1090; found {len(matches)}")
    return matches[0]


def upstreams(config):
    names = []
    for variable in ("backend", "public"):
        found = re.findall(rf'^\s*set \${variable} "([A-Za-z0-9_.-]+)";', config, re.M)
        if len(found) != 1:
            raise RuntimeError(f"expected one ${variable} upstream in site config")
        names.append(found[0])
    return tuple(names)


def config_for(config, api, public):
    upstreams(config)
    for variable, name in (("backend", api), ("public", public), ("api_backend", api)):
        config = re.sub(rf'^(\s*set \${variable} ")[A-Za-z0-9_.-]+(";)',
                        lambda match: match.group(1) + name + match.group(2), config, count=1, flags=re.M)
    return config


def code(base, route, timeout=15):
    try:
        with HTTP.open(base + route, timeout=timeout) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def port(name, ip):
    lines = docker("port", name, "80/tcp").stdout.splitlines()
    prefix = f"{ip}:" if ip == "127.0.0.1" else f"[{ip}]:"
    matches = [int(line.removeprefix(prefix)) for line in lines if line.startswith(prefix)]
    if len(matches) != 1:
        raise RuntimeError(f"missing {ip} port for {name}")
    return matches[0]


def probe(name, expected):
    ipv4 = f"http://127.0.0.1:{port(name, '127.0.0.1')}"
    ipv6 = f"http://[::1]:{port(name, '::1')}"
    for attempt in range(20):
        try:
            if code(ipv4, "/healthz", timeout=3) == 200 and code(ipv6, "/healthz", timeout=3) == 200:
                break
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(1)
    else:
        raise RuntimeError(f"{name} did not become healthy")
    for route, status in expected.items():
        actual = code(ipv4, route)
        if actual != status:
            raise RuntimeError(f"{name} {route}: expected {status}, got {actual}")
    docker("exec", name, "nginx", "-t")


def probe_rsc_cache_boundary(name):
    preview = f"http://127.0.0.1:{port(name, '127.0.0.1')}"
    command(sys.executable, str(ROOT / "scripts" / "check-rsc-cache-boundary.py"),
            "--base-url", preview, "--sample-sitemap")


def stop_remove(name):
    if inspect(name):
        docker("stop", name, check=False)
        for _ in range(30):
            if not inspect(name):
                return
            if docker("rm", name, check=False).returncode == 0:
                return
            time.sleep(0.2)
        raise RuntimeError(f"could not remove {name}")


def edge(name, config, static, alias, fixed=False):
    publish = ("127.0.0.1:1090:80", "[::1]:1090:80") if fixed else ("127.0.0.1::80", "[::1]::80")
    for attempt in range(3 if not fixed else 1):
        docker("run", "-d", "--name", name, "--restart", "unless-stopped", "--memory", "128m",
               "--network", NETWORK, "--network-alias", alias,
               "-p", publish[0], "-p", publish[1],
               "-v", f"{static}:/usr/share/nginx/html:ro",
               "-v", f"{config}:/etc/nginx/conf.d:ro", "nginx:alpine")
        if fixed:
            return
        for _ in range(5):
            try:
                ipv4 = f"http://127.0.0.1:{port(name, '127.0.0.1')}"
                ipv6 = f"http://[::1]:{port(name, '::1')}"
                if code(ipv4, "/healthz", timeout=1) == 200 and code(ipv6, "/healthz", timeout=1) == 200:
                    return
            except (OSError, urllib.error.URLError, RuntimeError):
                pass
            time.sleep(0.2)
        stop_remove(name)
    raise RuntimeError(f"{name} did not expose a healthy dual-loopback preview after {attempt + 1} attempts")


def names(tag):
    prefix = f"wp-site-{tag}"
    return {role: f"{prefix}-{role}" for role in ("api", "public", "edge", "check", "old-check")}


def release(tag):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,39}", tag):
        raise RuntimeError("release tag must contain lowercase letters, digits or hyphens (max 40)")
    return RELEASE_ROOT / tag, names(tag)


def state_path(artifact):
    return CONTROL_ROOT / artifact.name / "release.json"


def config_path(artifact):
    return CONTROL_ROOT / artifact.name / "nginx"


def snapshot_digest(root):
    """Hash names and bytes; reject links that could escape a static mount."""
    digest = hashlib.sha256()
    for item in sorted(root.rglob("*")):
        if item.is_symlink():
            raise RuntimeError(f"symlink in release static tree: {item}")
        if item.is_file():
            digest.update(str(item.relative_to(root)).encode() + b"\0")
            digest.update(str(item.stat().st_size).encode() + b"\0")
            with item.open("rb") as handle:
                for block in iter(lambda: handle.read(1024 * 1024), b""):
                    digest.update(block)
    return digest.hexdigest()


def read_state(artifact):
    return json.loads(state_path(artifact).read_text())


def prepare(tag):
    artifact, target = release(tag)
    old_edge = ingress()
    old_name = old_edge["Name"].lstrip("/")
    old_static = mount(old_edge, "/usr/share/nginx/html")
    old_config = mount(old_edge, "/etc/nginx/conf.d")
    old_config_text = (old_config / "default.conf").read_text()
    source_config = (ROOT / "deploy" / "nginx" / "default.conf").read_text()
    old_api, old_public = upstreams(old_config_text)
    upstreams(source_config)
    api_item, public_item = inspect(old_api), inspect(old_public)
    if not api_item or not public_item or not running(old_api) or not running(old_public):
        raise RuntimeError("current API or public service is unavailable")
    if not old_static.is_relative_to(RELEASE_ROOT):
        raise RuntimeError("current static mount is not a durable release")
    if any(inspect(name) for name in target.values()):
        raise RuntimeError("target release containers already exist")
    source = ROOT / "dist" / "releases" / tag
    if not (source / "index.html").is_file():
        raise RuntimeError(f"missing candidate static build: {source}")
    for image in (f"write_project-backend:{tag}", f"write_project-public:{tag}"):
        docker("image", "inspect", image)
    if artifact.exists() or (CONTROL_ROOT / tag).exists():
        raise RuntimeError(f"release tag already used: {tag}")
    baseline = {route: code(ORIGIN, route) for route in ROUTES}
    if baseline["/healthz"] != 200:
        raise RuntimeError("current ingress is unhealthy")
    source_digest = snapshot_digest(source)
    previous_digest = snapshot_digest(old_static)
    new_config = config_path(artifact)
    try:
        shutil.copytree(source, artifact, symlinks=True)
        if snapshot_digest(artifact) != source_digest:
            raise RuntimeError("candidate static copy differs from source")
        new_config.mkdir(parents=True)
        (new_config / "default.conf").write_text(config_for(source_config, target["api"], target["public"]))
        metadata = {"tag": tag, "previous_edge": old_name, "previous_edge_id": old_edge["Id"],
                    "previous_static": str(old_static), "previous_config": str(old_config),
                    "previous_api": old_api, "previous_public": old_public, "baseline": baseline,
                    "candidate_digest": source_digest, "previous_digest": previous_digest}
        state_path(artifact).write_text(json.dumps(metadata, indent=2) + "\n")
    except BaseException:
        shutil.rmtree(artifact, ignore_errors=True)
        shutil.rmtree(CONTROL_ROOT / tag, ignore_errors=True)
        raise
    started = []
    try:
        env_files = []
        try:
            for item in (api_item, public_item):
                with tempfile.NamedTemporaryFile(mode="w", prefix="wp-site-env-", delete=False) as handle:
                    # Docker keeps every -e given at creation; copying the list
                    # verbatim made it grow with each release. Keep the last value.
                    env = {}
                    for entry in item["Config"]["Env"]:
                        if "\n" in entry or "\r" in entry:
                            raise RuntimeError("multiline environment variable cannot be copied")
                        key, _, value = entry.partition("=")
                        env.pop(key, None)
                        env[key] = value
                    for key, value in env.items():
                        handle.write(f"{key}={value}\n")
                    env_files.append(handle.name)
            data_mount = mount(api_item, "/data")
            secrets_mount = mount(api_item, "/secrets")
            docker("run", "-d", "--name", target["api"], "--restart", "unless-stopped", "--memory", "768m",
                   "--network", NETWORK, "--network-alias", target["api"], "--env-file", env_files[0],
                   "-e", "DB_AUTO_CREATE_TABLES=0", "-e", "DB_RUN_LEGACY_MIGRATIONS=0",
                   "-e", f"TRUSTED_PROXY_HOSTNAME={target['edge']}",
                   "-e", f"NEXTJS_REVALIDATE_URL=http://{target['public']}:3000/api/revalidate",
                   "-v", f"{data_mount}:/data", "-v", f"{secrets_mount}:/secrets:ro",
                   "-v", f"{artifact}:/app/dist:ro", f"write_project-backend:{tag}")
            started.append(target["api"])
            docker("run", "-d", "--name", target["public"], "--restart", "unless-stopped", "--memory", "512m",
                   "--network", NETWORK, "--network-alias", target["public"], "--env-file", env_files[1],
                   "-e", f"BACKEND_API_URL=http://{target['api']}:1091", f"write_project-public:{tag}")
            started.append(target["public"])
        finally:
            for path in env_files:
                Path(path).unlink(missing_ok=True)
        for role in ("api", "public"):
            wait_service(target[role], role)
        edge(target["check"], new_config, artifact, target["edge"])
        started.append(target["check"])
        edge(target["old-check"], old_config, old_static, old_name)
        started.append(target["old-check"])
        probe(target["check"], {route: 200 for route in ROUTES})
        probe_rsc_cache_boundary(target["check"])
        probe(target["old-check"], baseline)
    except BaseException:
        for name in reversed(started):
            stop_remove(name)
        shutil.rmtree(artifact)
        shutil.rmtree(CONTROL_ROOT / tag)
        raise
    print(f"Prepared {tag}; current ingress is unchanged. Run activate --tag {tag} to switch.")


def state_and_names(tag):
    artifact, target = release(tag)
    state = read_state(artifact)
    if state["tag"] != tag:
        raise RuntimeError("release metadata tag mismatch")
    return artifact, target, state


def release_states_by_edge():
    states = {}
    for path in CONTROL_ROOT.glob("*/release.json"):
        state = json.loads(path.read_text())
        tag = state.get("tag")
        if tag != path.parent.name:
            raise RuntimeError(f"release metadata tag mismatch: {path}")
        edge_name = names(tag)["edge"]
        if edge_name in states:
            raise RuntimeError(f"duplicate release metadata: {edge_name}")
        states[edge_name] = state
    return states


def retired_ancestor_services(live_edge, states):
    """Return generations older than the direct rollback target."""
    current = states.get(live_edge)
    if not current:
        raise RuntimeError("live release has no metadata")
    older = current["previous_edge"]
    seen = {live_edge}
    retired = []
    while older in states:
        if older in seen:
            raise RuntimeError("release ancestry cycle")
        seen.add(older)
        state = states[older]
        predecessor = state["previous_edge"]
        retired.append((predecessor, state["previous_api"], state["previous_public"]))
        older = predecessor
    return retired


def wait_service(name, role):
    checks = {
        "api": ("python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:1091/api/health/ready', timeout=3)"),
        "public": ("node", "-e", "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"),
    }
    for _ in range(40):
        if docker("exec", name, *checks[role], check=False).returncode == 0:
            return
        time.sleep(1)
    raise RuntimeError(f"{name} did not become ready")


def retired_triplet_present(edge_name, api, public, protected):
    if set((api, public)) & protected:
        raise RuntimeError(f"retired services overlap the live rollback pair: {edge_name}")
    items = [inspect(name) for name in (edge_name, api, public)]
    if not any(items):
        return False  # An earlier cleanup already removed this whole generation.
    if not all(items):
        raise RuntimeError(f"retired service container is partially missing: {edge_name}")
    edge_item = items[0]
    if running(edge_name):
        raise RuntimeError(f"retired ingress must be stopped: {edge_name}")
    edge_config = mount(edge_item, "/etc/nginx/conf.d")
    if upstreams((edge_config / "default.conf").read_text()) != (api, public):
        raise RuntimeError(f"retired ingress upstream mismatch: {edge_name}")
    return True


def retire_ancestors(dry_run=False):
    live = ingress()
    live_name = live["Name"].lstrip("/")
    states = release_states_by_edge()
    current = states.get(live_name)
    if not current:
        raise RuntimeError("live release has no metadata")
    live_config = mount(live, "/etc/nginx/conf.d")
    live_services = upstreams((live_config / "default.conf").read_text())
    expected = names(current["tag"])
    if live_services != (expected["api"], expected["public"]):
        raise RuntimeError("live ingress upstreams do not match release metadata")
    if not running(current["previous_api"]) or not running(current["previous_public"]):
        raise RuntimeError("immediate rollback services must remain running")
    protected = set(live_services) | {current["previous_api"], current["previous_public"]}
    retired = retired_ancestor_services(live_name, states)
    active_previews = [name for name in docker("ps", "--format", "{{.Names}}").stdout.splitlines()
                       if name.startswith("wp-site-") and name.endswith(("-check", "-old-check"))]
    if active_previews:
        raise RuntimeError(f"prepared previews are still running: {', '.join(active_previews)}")
    present = [(edge_name, api, public) for edge_name, api, public in retired
               if retired_triplet_present(edge_name, api, public, protected)]
    for edge_name, api, public in present:
        if dry_run:
            print(f"Would retire {edge_name}: {api}, {public}")
            continue
        for name in (public, api):
            if running(name):
                docker("stop", "-t", "10", name)
        print(f"Retired {edge_name} API/public; containers and images remain for recovery.")


def activate(tag):
    artifact, target, state = state_and_names(tag)
    current = ingress()
    if current["Id"] != state["previous_edge_id"]:
        raise RuntimeError("ingress changed after prepare; prepare a fresh release")
    if snapshot_digest(artifact) != state["candidate_digest"]:
        raise RuntimeError("candidate static files changed after prepare")
    if snapshot_digest(Path(state["previous_static"])) != state["previous_digest"]:
        raise RuntimeError("previous static files changed after prepare")
    if any(not running(target[role]) for role in ("api", "public", "check", "old-check")):
        raise RuntimeError("prepared containers are not all running")
    probe(target["check"], {route: 200 for route in ROUTES})
    probe_rsc_cache_boundary(target["check"])
    probe(target["old-check"], state["baseline"])
    switched = False
    try:
        switched = True
        docker("stop", "-t", "10", state["previous_edge"])
        edge(target["edge"], config_path(artifact), artifact, target["edge"], fixed=True)
        probe(target["edge"], {route: 200 for route in ROUTES})
    except BaseException:
        if switched:
            stop_remove(target["edge"])
            if not running(state["previous_edge"]):
                docker("start", state["previous_edge"])
            probe(state["previous_edge"], state["baseline"])
        raise
    for role in ("check", "old-check"):
        try:
            stop_remove(target[role])
        except RuntimeError as error:
            print(f"Warning: preview cleanup: {error}", file=sys.stderr)
    print(f"Live release: {tag}. Rollback: rollback --tag {tag}")


def rollback(tag):
    _, target, state = state_and_names(tag)
    if ingress()["Name"].lstrip("/") != target["edge"]:
        raise RuntimeError("this release is not the live ingress")
    previous = inspect(state["previous_edge"])
    if not previous or previous["Id"] != state["previous_edge_id"] or previous["State"]["Running"]:
        raise RuntimeError("previous ingress is missing or not stopped")
    if not inspect(state["previous_api"]) or not inspect(state["previous_public"]):
        raise RuntimeError("previous API or public service container is missing")
    if snapshot_digest(Path(state["previous_static"])) != state["previous_digest"]:
        raise RuntimeError("previous static files changed after prepare")
    check_name = target["old-check"]
    if inspect(check_name):
        raise RuntimeError("previous preview name is occupied")
    started = []
    try:
        for role in ("api", "public"):
            name = state[f"previous_{role}"]
            if not running(name):
                docker("start", name)
                started.append(name)
            wait_service(name, role)
        try:
            edge(check_name, state["previous_config"], state["previous_static"], state["previous_edge"])
            probe(check_name, state["baseline"])
        finally:
            stop_remove(check_name)
        try:
            docker("stop", "-t", "10", target["edge"])
            docker("start", state["previous_edge"])
            probe(state["previous_edge"], state["baseline"])
        except BaseException:
            if running(state["previous_edge"]):
                docker("stop", state["previous_edge"], check=False)
            if not running(target["edge"]):
                docker("start", target["edge"])
            probe(target["edge"], {route: 200 for route in ROUTES})
            raise
    except BaseException:
        if running(target["edge"]):
            for name in reversed(started):
                docker("stop", "-t", "10", name, check=False)
        raise
    print(f"Restored previous ingress {state['previous_edge']}; candidate API/public remain available.")


def stop_prepared(tag):
    _, target, _ = state_and_names(tag)
    if running(target["edge"]):
        raise RuntimeError("cannot stop a live release")
    for role in ("edge", "check", "old-check", "public", "api"):
        stop_remove(target[role])
    print(f"Stopped prepared containers for {tag}; immutable artifact remains.")


ROLES = ("api", "public", "edge", "check", "old-check")
IMAGE_REPOSITORIES = ("write_project-backend", "write_project-public")
EDGE_PATTERN = re.compile(r"wp-site-(.+)-edge")


def tag_of_edge(edge_name):
    match = EDGE_PATTERN.fullmatch(edge_name or "")
    return match.group(1) if match else None


def known_release_tags():
    """Every tag that still has a container, image, release directory or build output."""
    tags = set()
    for root in (RELEASE_ROOT, CONTROL_ROOT, ROOT / "dist" / "releases"):
        if root.is_dir():
            tags.update(path.name for path in root.iterdir() if path.is_dir() and not path.name.startswith("."))
    for line in docker("ps", "-a", "--format", "{{.Names}}").stdout.splitlines():
        for role in ROLES:
            if line.startswith("wp-site-") and line.endswith(f"-{role}"):
                tags.add(line[len("wp-site-"):-len(role) - 1])
                break
    for repository in IMAGE_REPOSITORIES:
        tags.update(tag for tag in docker("images", repository, "--format", "{{.Tag}}").stdout.split() if tag != "<none>")
    return {tag for tag in tags if re.fullmatch(r"[a-z0-9][a-z0-9-]{0,39}", tag)}


def prune(dry_run=False):
    """Delete releases older than the live one and its rollback target.

    Retire-ancestors only stops old services; this removes their containers,
    images, durable static files, control data and build output. The live
    release and the release it rolls back to are always kept whole, and a
    release with any running container is skipped (it may be mid-deploy).
    """
    live_name = ingress()["Name"].lstrip("/")
    current = release_states_by_edge().get(live_name)
    if not current:
        raise RuntimeError("live release has no metadata; refusing to prune")
    keep = {current["tag"], tag_of_edge(current["previous_edge"])} - {None}
    if tag_of_edge(current["previous_edge"]) is None:
        raise RuntimeError(f"rollback target {current['previous_edge']} is not a site release; refusing to prune")
    running_names = set(docker("ps", "--format", "{{.Names}}").stdout.splitlines())
    removed = []
    for tag in sorted(known_release_tags() - keep):
        containers = [names(tag)[role] for role in ROLES if inspect(names(tag)[role])]
        busy = [name for name in containers if name in running_names]
        if busy:
            print(f"Skipping {tag}: still running {', '.join(busy)}")
            continue
        images = [f"{repository}:{tag}" for repository in IMAGE_REPOSITORIES
                  if docker("image", "inspect", f"{repository}:{tag}", check=False).returncode == 0]
        paths = [path for path in (RELEASE_ROOT / tag, CONTROL_ROOT / tag, ROOT / "dist" / "releases" / tag) if path.exists()]
        print(f"{'Would remove' if dry_run else 'Removing'} {tag}: "
              f"{len(containers)} container(s), {', '.join(images) or 'no images'}, {len(paths)} director(ies)")
        if dry_run:
            continue
        for name in containers:
            stop_remove(name)
        for image in images:
            # No force: an image some container still uses must stay.
            if docker("rmi", image, check=False).returncode != 0:
                print(f"  kept {image}: still in use")
        for path in paths:
            shutil.rmtree(path)
        removed.append(tag)
    # Build output of kept releases was copied into the durable release directory at prepare.
    for tag in sorted(keep):
        build = ROOT / "dist" / "releases" / tag
        if build.exists() and (RELEASE_ROOT / tag).exists():
            print(f"{'Would remove' if dry_run else 'Removing'} build output dist/releases/{tag} (copied at prepare)")
            if not dry_run:
                shutil.rmtree(build)
    print(f"Kept {', '.join(sorted(keep))}" + ("" if dry_run else f"; removed {len(removed)} older release(s)"))


def main():
    def interrupted(signum, frame):
        raise RuntimeError(f"site release interrupted by signal {signum}")

    signal.signal(signal.SIGINT, interrupted)
    signal.signal(signal.SIGTERM, interrupted)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("status", "current-api", "prepare", "activate", "rollback", "stop-prepared", "retire-ancestors", "prune"))
    parser.add_argument("--tag", default=os.environ.get("RELEASE_TAG"))
    parser.add_argument("--dry-run", action="store_true", help="show what retire-ancestors or prune would do without doing it")
    args = parser.parse_args()
    if args.dry_run and args.action not in ("retire-ancestors", "prune"):
        parser.error("--dry-run is only available with retire-ancestors and prune")
    if args.action == "status":
        item = ingress()
        print(f"Live ingress: {item['Name'].lstrip('/')} ({item['Id'][:12]})")
        print(f"Static: {mount(item, '/usr/share/nginx/html')}")
        print(f"Config: {mount(item, '/etc/nginx/conf.d')}")
        return
    if args.action == "current-api":
        # The API container behind the live ingress, for jobs that must reuse its image and settings.
        item = ingress()
        api, _public = upstreams(mount(item, "/etc/nginx/conf.d").joinpath("default.conf").read_text())
        print(api)
        return
    if args.action not in ("retire-ancestors", "prune") and not args.tag:
        parser.error("--tag or RELEASE_TAG is required")
    CONTROL_ROOT.mkdir(parents=True, exist_ok=True)
    with (CONTROL_ROOT / ".lock").open("a+") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise RuntimeError("another site release operation is running") from error
        if args.action == "retire-ancestors":
            retire_ancestors(dry_run=args.dry_run)
        elif args.action == "prune":
            prune(dry_run=args.dry_run)
        else:
            {"prepare": prepare, "activate": activate, "rollback": rollback,
             "stop-prepared": stop_prepared}[args.action](args.tag)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
