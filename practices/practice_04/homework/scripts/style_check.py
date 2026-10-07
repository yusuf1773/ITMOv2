#!/usr/bin/env python3
"""One C/C++ style checker for files, stdin, Git index and MCP. No compilation."""
import argparse
import re
import subprocess
import sys
from pathlib import Path

EXTENSIONS = {'.c', '.cc', '.cpp', '.cxx', '.c++', '.h', '.hh', '.hpp', '.hxx', '.h++', '.ipp', '.tpp'}
# Mask comments and literals, preserving line breaks. Includes in angle brackets
# remain visible. Raw strings must be consumed before ordinary quoted strings.
LEXEMES = re.compile(r'R"([^ ()\\\t\r\n]{0,16})\([\s\S]*?\)\1"|/\*[\s\S]*?\*/|//[^\n]*|"(?:\\[\s\S]|[^"\\])*"|\'(?:\\[\s\S]|[^\'\\])*\'')

def function_open(fragment):
    # Look for a function declarator before an opening brace. This is a style
    # heuristic, not a full C++ parser; control blocks are excluded.
    head = re.sub(r'\b(?:const|noexcept|override|final)\s*$', '', fragment.strip())
    if '->' in head:
        head = head.rsplit('->', 1)[0].rstrip()
    close = head.rfind(')')
    if close < 0 or head[close + 1:].strip():
        return False
    depth = 0
    opening = -1
    for index in range(close, -1, -1):
        if head[index] == ')':
            depth += 1
        elif head[index] == '(':
            depth -= 1
            if depth == 0:
                opening = index
                break
    if opening < 0:
        return False
    name = re.search(r'([A-Za-z_]\w*)\s*$', head[:opening])
    return bool(name and name.group(1) not in {'if', 'for', 'while', 'switch', 'catch'})

def blank_lines_in_functions(text):
    visible = LEXEMES.sub(lambda m: re.sub(r'[^\n]', ' ', m.group()), text)
    brace_depth = 0
    function_depth = None
    fragment = ''
    for number, (line, original) in enumerate(zip(visible.splitlines(keepends=True), text.splitlines(keepends=True)), 1):
        if function_depth is not None and not original.strip():
            yield number
        for char in line:
            if char == '{':
                if function_depth is None and function_open(fragment):
                    function_depth = brace_depth + 1
                brace_depth += 1
                fragment = ''
            elif char == '}':
                if function_depth == brace_depth:
                    function_depth = None
                brace_depth = max(0, brace_depth - 1)
                fragment = ''
            elif char == ';':
                fragment = ''
            else:
                fragment += char

def check_source(data, name='source.cpp'):
    errors = []
    if Path(name).suffix.lower() not in EXTENSIONS:
        return errors
    text = data.decode('utf-8-sig', errors='replace')
    for number, line in enumerate(text.splitlines(), 1):
        indent = re.match(r'[ \t]*', line).group()
        if '\t' in indent:
            errors.append(f'{name}:{number}: TAB_INDENT: use spaces in indentation')
    for number in blank_lines_in_functions(text):
        errors.append(f'{name}:{number}: BLANK_LINE: remove empty line inside function')
    if not data.endswith(b'\n'):
        errors.append(f'{name}: EOF_NEWLINE: source must end with newline')
    # Translation phase 2: splice continued preprocessor lines before lexing.
    logical = re.sub(r'\\\r?\n', '', text)
    visible = LEXEMES.sub(lambda m: re.sub(r'[^\n]', ' ', m.group()), logical)
    for number, line in enumerate(visible.splitlines(), 1):
        if re.match(r'^\s*#\s*include\s*<\s*bits/stdc\+\+\.h\s*>', line):
            errors.append(f'{name}:logical-line-{number}: BITS_INCLUDE: include individual standard headers')
        if re.match(r'^\s*#\s*define\b', line):
            errors.append(f'{name}:logical-line-{number}: MACRO_DEFINE: macros are forbidden')
    if Path(name).suffix.lower() in {'.cc', '.cpp', '.cxx', '.c++'} and re.search(r'\bmain\s*\(', visible):
        if not re.search(r'\b(?:std\s*::\s*)?(?:ios_base|ios)\s*::\s*sync_with_stdio\s*\(\s*false\s*\)', visible):
            errors.append(f'{name}: FAST_IO_SYNC: add ios_base::sync_with_stdio(false)')
        if not re.search(r'\b(?:std\s*::\s*)?cin\s*\.\s*tie\s*\(\s*nullptr\s*\)', visible):
            errors.append(f'{name}: FAST_IO_TIE: add cin.tie(nullptr)')
    return errors

def git(*args, cwd=None):
    return subprocess.check_output(['git', *args], cwd=cwd)

def staged_sources():
    root = git('rev-parse', '--show-toplevel').decode().strip()
    names = git('diff', '--cached', '--name-only', '--diff-filter=ACMRT', '-z', cwd=root)
    for raw in names.split(b'\0'):
        if not raw:
            continue
        name = raw.decode('utf-8', errors='surrogateescape')
        if Path(name).suffix.lower() in EXTENSIONS:
            yield name, git('show', ':' + name, cwd=root)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--staged', action='store_true', help='check staged blobs, never working-tree contents')
    mode.add_argument('--stdin', metavar='NAME', help='read exact bytes from stdin; NAME supplies extension')
    parser.add_argument('files', nargs='*')
    args = parser.parse_args()
    if (args.staged or args.stdin) and args.files:
        parser.error('choose files, --staged or --stdin')
    if not (args.staged or args.stdin or args.files):
        parser.error('provide files, --staged or --stdin')
    try:
        if args.staged:
            sources = staged_sources()
        elif args.stdin:
            sources = [(args.stdin, sys.stdin.buffer.read())]
        else:
            sources = ((p, Path(p).read_bytes()) for p in args.files)
        errors, count = [], 0
        for name, data in sources:
            if Path(name).suffix.lower() in EXTENSIONS:
                count += 1
            errors.extend(check_source(data, name))
        for error in errors:
            print(error)
        print(f'STYLE {"FAIL" if errors else "PASS"}: {count} C/C++ file(s)')
        return 1 if errors else 0
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f'STYLE FAIL: cannot read sources: {exc}', file=sys.stderr)
        return 2

if __name__ == '__main__':
    sys.exit(main())
