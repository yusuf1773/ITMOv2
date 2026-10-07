#!/usr/bin/env python3
"""Check style infrastructure only. Never compile or execute a solution."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
CHECK = ROOT / 'scripts/style_check.py'

def run(args, **kw):
    return subprocess.run(args, capture_output=True, **kw)

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

def main():
    good = b'#include <iostream>\nusing namespace std;\nint main(){\n    ios_base::sync_with_stdio(false);\n    cin.tie(nullptr);\n    if(1)return 0;\n}\n'
    cases = [
        ('compact style allowed', good, 0, b'STYLE PASS'),
        ('bits header', b'#include <bits/stdc++.h>\n', 1, b'BITS_INCLUDE'),
        ('missing sync', b'int main(){cin.tie(nullptr);}\n', 1, b'FAST_IO_SYNC'),
        ('missing tie', b'int main(){std::ios_base::sync_with_stdio(false);}\n', 1, b'FAST_IO_TIE'),
        ('qualified calls', b'int main(){std::ios_base::sync_with_stdio(false);std::cin.tie(nullptr);}\n', 0, b'STYLE PASS'),
        ('no main', b'void helper(){}\n', 0, b'STYLE PASS'),
        ('header with main text', b'int main();\n', 0, b'STYLE PASS'),
        ('int macro', b'#define int long long\n', 1, b'MACRO_DEFINE'),
        ('other macro', b'#define ANSWER 42\n', 1, b'MACRO_DEFINE'),
        ('continued macro', b'#defi\\\nne FLAG 1\n', 1, b'MACRO_DEFINE'),
        ('blank lines outside functions', b'\n\nint x;\n\n\nvoid helper() {}\n\n', 0, b'STYLE PASS'),
        ('empty line in function', b'void helper() {\n\n}', 1, b'BLANK_LINE'),
        ('whitespace line in nested block', b'void helper() {\n    if (true) {\n   \n    }\n}\n', 1, b'BLANK_LINE'),
        ('blank line in namespace outside function', b'namespace n {\n\nvoid helper() {}\n\n}\n', 0, b'STYLE PASS'),
        ('tab indent', b' \tint x;\n', 1, b'TAB_INDENT'),
        ('missing newline', b'int x;', 1, b'EOF_NEWLINE'),
        ('empty source', b'', 1, b'EOF_NEWLINE'),
        ('comments and literals', b'/*\n#include <bits/stdc++.h>\n*/\nconst char *x=R"foo(\n#define int long long\n)foo";\n', 0, b'STYLE PASS'),
        ('directive comments', b'# define int /* alias */ long long\n', 1, b'MACRO_DEFINE'),
        ('continued include', b'#inc\\\nlude <bits/stdc++.h>\n', 1, b'BITS_INCLUDE'),
        ('CRLF', good.replace(b'\n', b'\r\n'), 0, b'STYLE PASS'),
        ('tab inside string', b'const char *x="a\tb";\n', 0, b'STYLE PASS'),
        ('multiple violations', b'#include <bits/stdc++.h>\n#define int long long\n\tint x;', 1, b'EOF_NEWLINE'),
    ]
    for name, data, expected, diagnostic in cases:
        suffix = 'hpp' if name == 'header with main text' else 'cpp'
        p = run([sys.executable, str(CHECK), '--stdin', 'case.' + suffix], input=data)
        assert p.returncode == expected and diagnostic in p.stdout, (name, p.stdout, p.stderr)
        print('PASS:', name)
    p = run([sys.executable, str(CHECK), '/nonexistent/cp-style-check.cpp'])
    assert p.returncode == 2
    print('PASS: missing file fails closed')

    # Separate temporary repository: no changes to the user's index or commits.
    with tempfile.TemporaryDirectory(prefix='cp-style-hook-') as tmp:
        cwd = Path(tmp)
        def git(*args):
            p = run(['git', *args], cwd=cwd)
            assert p.returncode == 0, p.stderr
            return p
        git('init', '-q')
        dest = cwd / 'practices/practice_04/homework/scripts'
        dest.mkdir(parents=True)
        (dest/'style_check.py').write_bytes(CHECK.read_bytes())
        hook = ROOT/'git-hooks/pre-commit'
        git('config', 'core.hooksPath', str(hook.parent))
        name = 'source with spaces\nand newline.cpp'
        src = cwd/name
        src.write_bytes(b'#define int long long\n')
        git('add', '--', name)
        src.write_bytes(good)
        p = run([str(hook)], cwd=cwd)
        assert p.returncode == 1 and b'MACRO_DEFINE' in p.stdout
        # Actual commit attempt must stop before creating a commit.
        p = run(['git', '-c', 'user.name=Checker', '-c', 'user.email=checker@example.invalid', 'commit', '-m', 'must be blocked'], cwd=cwd)
        assert p.returncode != 0 and b'STYLE FAIL' in p.stdout+p.stderr
        assert run(['git', 'rev-parse', '--verify', 'HEAD'], cwd=cwd).returncode != 0
        print('PASS: staged bad / worktree good; real commit blocked')
        git('add', '--', name)
        src.write_bytes(b'\tint x;')
        p = run([str(hook)], cwd=cwd)
        assert p.returncode == 0
        print('PASS: staged good / worktree bad; unusual filename')
        renamed = 'renamed.hpp'
        src.rename(cwd/renamed)
        git('add', '-A', '--', name, renamed)
        assert run([str(hook)], cwd=cwd).returncode == 1
        (cwd/renamed).unlink()
        git('add', '-A', '--', renamed)
        assert run([str(hook)], cwd=cwd).returncode == 0
        print('PASS: renamed header checked; deletion skipped')

    # MCP gate only: poison every route toward task lookup/compilation/execution.
    mcp = load('cp_tasks_environment_check', ROOT/'mcp/cp_tasks_mcp.py')
    style = load('cp_style_environment_check', CHECK)
    assert style.check_source(b'#define int long long\n')
    with patch.object(mcp, 'lookup', side_effect=AssertionError('must not read task')), \
         patch.object(mcp, 'compile_source', side_effect=AssertionError('must not compile')), \
         patch.object(mcp, 'run_limited', side_effect=AssertionError('must not execute')):
        result = mcp.tool_check_solution({'source_code':'#define int long long\n', 'language':'cpp17'})
        assert result['isError'] and result['structuredContent']['status'] == 'STYLE_FAIL'
        assert result['structuredContent']['attempted_tests'] == 0
    print('PASS: MCP STYLE_FAIL blocks lookup, compilation and execution')
    requests = [
        {'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2024-11-05'}},
        {'jsonrpc':'2.0','method':'notifications/initialized'},
        {'jsonrpc':'2.0','id':2,'method':'tools/list'},
    ]
    p = run([sys.executable, str(ROOT/'mcp/cp_tasks_mcp.py')], input=''.join(json.dumps(r)+'\n' for r in requests).encode())
    assert p.returncode == 0, p.stderr
    replies = [json.loads(x) for x in p.stdout.splitlines()]
    assert replies[0]['result']['serverInfo']['name'] == 'cp-tasks-mcp'
    assert {t['name'] for t in replies[1]['result']['tools']} == {'list_tasks','get_task','check_solution'}
    print('PASS: MCP stdio initialize and tools/list; no testing tool called over MCP')
    print('ALL INFRASTRUCTURE CHECKS PASS; no solutions compiled or executed')

if __name__ == '__main__':
    main()
