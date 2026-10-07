"""Run five independent read-only OpenCode sessions against an isolated demo copy."""
import json
import hashlib
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
from datetime import datetime

ROOT = Path(__file__).resolve().parent


def main():
    questions = re.findall(r'^\d+\. (.+)$', (ROOT / 'QUESTIONS.md').read_text(), re.M)
    assert len(questions) == 5, 'Expected exactly five questions'
    output = ROOT / 'results' / datetime.now().strftime('%Y%m%d-%H%M%S')
    output.mkdir(parents=True, exist_ok=False)
    with tempfile.TemporaryDirectory(prefix='itmo-practice03-') as tmp:
        work = Path(tmp)
        demo = work / 'demo'
        demo.mkdir()
        for name in ('README.md', 'service.py', 'test_service.py', 'Makefile',
                     'repo-system.txt', 'opencode.json'):
            shutil.copy2(ROOT / 'demo' / name, demo / name)
        shutil.copytree(demo, output / 'inputs')
        hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in demo.iterdir()}
        (output / 'input-sha256.json').write_text(json.dumps(hashes, indent=2) + '\n')
        env = os.environ.copy()
        env.update(PWD=str(demo), OPENCODE_CONFIG=str(demo / 'opencode.json'),
                   OPENCODE_CONFIG_DIR=str(work / 'config'),
                   OPENCODE_DISABLE_PROJECT_CONFIG='1',
                   npm_config_cache=str(work / 'npm-cache'))
        for index, question in enumerate(questions, 1):
            start = time.perf_counter()
            command = ['opencode', 'run', '--dir', str(demo), '--pure', '--agent', 'local-guide',
                       '--model', 'ollama/itmo-practice03-qwen8b', '--format', 'json',
                       '--title', f'Practice 03 Q{index}', f'Рабочая папка: {demo}. Сначала инструментом read прочитай файлы {demo}/README.md, {demo}/Makefile, {demo}/service.py и {demo}/test_service.py. Затем ответь на вопрос по прочитанным файлам, укажи файл и строку. Если данных нет, прямо скажи об этом. Вопрос: ' + question + ' /no_think']
            with (output / f'q{index}.jsonl').open('w') as out, \
                 (output / f'q{index}.stderr').open('w') as err:
                try:
                    result = subprocess.run(command, cwd=demo, env=env,
                                            stdout=out, stderr=err, timeout=600)
                    code = result.returncode
                except subprocess.TimeoutExpired:
                    code = 124
            metadata = {'question': question, 'prompt': command[-1], 'model': 'ollama/itmo-practice03-qwen8b', 'wall_seconds': time.perf_counter()-start,
                        'returncode': code}
            (output / f'q{index}.meta.json').write_text(
                json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
            print(f'Question {index}: exit={code}, {metadata["wall_seconds"]:.1f}s', flush=True)
            if code:
                raise SystemExit(f'Run failed; preserved evidence in {output}')
    print(f'Results: {output}')


if __name__ == '__main__':
    main()
