#!/usr/bin/env python3
"""Check tracked Markdown fences and local link/image targets, without network access."""
import re
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def check_file(path, root):
    errors = []
    fence = None
    prose = []
    for number, line in enumerate(path.read_text().splitlines(), 1):
        marker = re.match(r'^\s{0,3}(`{3,}|~{3,})(.*)$', line)
        if marker:
            run, tail = marker.groups()
            if fence is None:
                fence = (run[0], len(run), number)
            elif run[0] == fence[0] and len(run) >= fence[1] and not tail.strip():
                fence = None
            continue
        if fence is None:
            prose.append((number, re.sub(r'(`+).*?\1', '', line)))
    if fence:
        errors.append(f'{path.relative_to(root)}:{fence[2]}: unclosed code fence')
    definitions = {}
    for number, line in prose:
        match = re.match(r'^\s{0,3}\[([^]]+)\]:\s*(<[^>]+>|\S+)', line)
        if match:
            definitions[' '.join(match[1].lower().split())] = match[2].strip('<>')
    for number, line in prose:
        targets = re.findall(r'!?\[[^]\n]*\]\(\s*(<[^>]+>|(?:[^\s()\\]|\\.|\([^()]*\))+)\s*(?:["\'][^\n]*["\']\s*)?\)', line)
        for label, reference in re.findall(r'!?\[([^]]+)\]\[([^]]*)\]', line):
            key = ' '.join((reference or label).lower().split())
            if key not in definitions:
                errors.append(f'{path.relative_to(root)}:{number}: undefined link reference {key!r}')
            else:
                targets.append(definitions[key])
        definition = re.match(r'^\s{0,3}\[[^]]+\]:\s*(<[^>]+>|\S+)', line)
        if definition:
            targets.append(definition[1])
        for target in targets:
            target = re.sub(r'\\([\\() ])', r'\1', target.strip('<>'))
            url = urlsplit(target)
            if url.scheme or url.netloc or not url.path:
                continue
            local = root / unquote(url.path).lstrip('/') if url.path.startswith('/') else path.parent / unquote(url.path)
            if not local.exists():
                errors.append(f'{path.relative_to(root)}:{number}: missing local target {target!r}')
    return errors


def main():
    tracked = subprocess.check_output(['git', 'ls-files', '-z', '--', '*.md'], cwd=ROOT).decode().split('\0')
    errors = []
    for name in filter(None, tracked):
        path = ROOT / name
        if path.is_file():  # Deleted Markdown is absent; incoming links are still checked.
            errors.extend(check_file(path, ROOT))
    if errors:
        print('\n'.join(errors))
        return 1
    print('Tracked Markdown: fences and local link/image targets passed')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
