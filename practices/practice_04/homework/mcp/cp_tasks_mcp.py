#!/usr/bin/env python3
"""MCP server for browsing competitive-programming task archives and checking solutions."""
from __future__ import annotations

import ctypes
import ctypes.util
import json
import os
import re
import resource
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import traceback
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET


MAX_ARCHIVE_FILE = 32 * 1024 * 1024
MAX_SOURCE = 1_000_000
MAX_OUTPUT = 1_000_000
MAX_RUNS = 500
_TASK_CACHE: tuple[tuple[tuple[str, int], ...], list["Task"]] | None = None


def configured_archives() -> list[Path]:
    raw = os.environ.get("CP_TASK_ARCHIVES")
    values = raw.split(os.pathsep) if raw else []
    return [Path(p).expanduser() for p in values if p]


def rar_entries(path: Path) -> dict[str, bytes]:
    """Read a RAR (including nested tests.rar) through system libarchive."""
    library = ctypes.util.find_library("archive")
    if not library:
        raise RuntimeError("Для чтения RAR нужен системный libarchive.")
    lib = ctypes.CDLL(library)
    ptr = ctypes.c_void_p

    def fn(name: str, args: list[Any], result: Any):
        f = getattr(lib, name)
        f.argtypes, f.restype = args, result
        return f

    new = fn("archive_read_new", [], ptr)
    fn("archive_read_support_filter_all", [ptr], ctypes.c_int)
    fn("archive_read_support_format_all", [ptr], ctypes.c_int)
    open_file = fn("archive_read_open_filename", [ptr, ctypes.c_char_p, ctypes.c_size_t], ctypes.c_int)
    next_header = fn("archive_read_next_header", [ptr, ctypes.POINTER(ptr)], ctypes.c_int)
    pathname = fn("archive_entry_pathname", [ptr], ctypes.c_char_p)
    size = fn("archive_entry_size", [ptr], ctypes.c_longlong)
    read_data = fn("archive_read_data", [ptr, ptr, ctypes.c_size_t], ctypes.c_ssize_t)
    skip_data = fn("archive_read_data_skip", [ptr], ctypes.c_int)
    close = fn("archive_read_free", [ptr], ctypes.c_int)
    archive = new()
    lib.archive_read_support_filter_all(archive)
    lib.archive_read_support_format_all(archive)
    if open_file(archive, os.fsencode(path), 10240) != 0:
        close(archive)
        raise RuntimeError(f"Не удалось открыть архив {path}")
    result: dict[str, bytes] = {}
    entry = ptr()
    try:
        while next_header(archive, ctypes.byref(entry)) == 0:
            name_b = pathname(entry)
            if not name_b:
                continue
            name = name_b.decode("utf-8", "replace").replace("\\", "/")
            if not keep_entry(name):
                skip_data(archive)
                continue
            declared = size(entry)
            if declared < 0 or declared > MAX_ARCHIVE_FILE:
                continue
            chunks, total = [], 0
            while True:
                buf = ctypes.create_string_buffer(65536)
                n = read_data(archive, buf, len(buf))
                if n <= 0:
                    break
                total += n
                if total > MAX_ARCHIVE_FILE:
                    chunks = []
                    break
                chunks.append(buf.raw[:n])
            if chunks or total == 0:
                result[name] = b"".join(chunks)
    finally:
        close(archive)
    return result


def archive_entries(path: Path) -> dict[str, bytes]:
    if path.suffix.lower() == ".zip":
        out: dict[str, bytes] = {}
        with zipfile.ZipFile(path) as archive:
            for info in archive.infolist():
                name = info.filename.replace("\\", "/")
                if info.is_dir() or info.file_size > MAX_ARCHIVE_FILE or not keep_entry(name):
                    continue
                out[name] = archive.read(info)
        return out
    if path.suffix.lower() == ".rar":
        return rar_entries(path)
    raise ValueError(f"Формат архива не поддерживается: {path.name}")


def keep_entry(name: str) -> bool:
    low = name.casefold()
    base = low.rsplit("/", 1)[-1]
    if low.endswith(("problem.xml", "problem-properties.json", "testlib.h", "check.cpp", "checker.cpp", "problem.tex", "/tests/tests.rar")):
        return True
    if "/tests/" in low or low.startswith("tests/"):
        return re.fullmatch(r"(?:.*/)?tests/(?:\d+|\d+\.a)", low) is not None
    if re.fullmatch(r"\d+(?:\.a)?", low):
        return True
    return base in {"legend.tex", "input.tex", "output.tex", "name.tex", "notes.tex"}


def decode(data: bytes) -> str:
    return data.decode("utf-8-sig", "replace")


def find_casefold(entries: dict[str, bytes], suffix: str) -> str | None:
    suffix = suffix.casefold()
    return next((k for k in entries if k.casefold().endswith(suffix)), None)


@dataclass
class Task:
    task_id: str
    archive: Path
    prefix: str
    entries: dict[str, bytes]
    props: dict[str, Any]
    xml: ET.Element | None
    tests: dict[int, tuple[str, str | None]]
    groups: dict[str, dict[str, Any]]
    checker: str | None

    @property
    def title(self) -> str:
        return str(self.props.get("name") or self.prefix.rstrip("/").split("/")[-1] or self.task_id)


def parse_task(archive_path: Path, entries: dict[str, bytes], prefix: str, xml_path: str | None,
               props_path: str | None) -> Task:
    xml = ET.fromstring(entries[xml_path]) if xml_path else None
    props: dict[str, Any] = {}
    if props_path:
        try:
            props = json.loads(decode(entries[props_path]))
        except (ValueError, TypeError):
            props = {}
    if not props:
        statement = next((p for p in entries if p.startswith(prefix) and p.endswith("problem.tex")), None)
        if statement:
            props = {"name": prefix.rstrip("/").split("/")[-1], "legend": decode(entries[statement])}

    judging = xml.find("judging/testset") if xml is not None else None
    tests: dict[int, tuple[Any, ...]] = {}
    groups: dict[str, dict[str, Any]] = {}
    checker = None
    if judging is not None:
        input_pattern = judging.findtext("input-path-pattern") or "tests/%02d"
        answer_pattern = judging.findtext("answer-path-pattern") or "tests/%02d.a"
        for i in range(1, int(judging.findtext("test-count") or 0) + 1):
            inp = (prefix + input_pattern % i).lstrip("/")
            ans = (prefix + answer_pattern % i).lstrip("/")
            if inp in entries:
                tests[i] = (inp, ans if ans in entries else None)
        for group in judging.findall("./groups/group"):
            name = group.get("name", "?")
            deps = [d.get("group") for d in group.findall("./dependencies/dependency") if d.get("group")]
            try:
                points = float(group.get("points")) if group.get("points") is not None else None
            except ValueError:
                points = None
            groups[name] = {"points": points, "dependencies": deps, "points_policy": group.get("points-policy", "complete-group")}
        group_tests = judging.findall("./tests/test")
        if group_tests:
            for i, test in enumerate(group_tests, 1):
                if i in tests:
                    try:
                        test_points = float(test.get("points")) if test.get("points") is not None else None
                    except ValueError:
                        test_points = None
                    tests[i] = (tests[i][0], tests[i][1], test.get("group", "?"), test_points)
        else:
            tests = {i: (a, b, "?", None) for i, (a, b) in tests.items()}
        if not group_tests:
            groups = {"?": {"points": None, "dependencies": [], "points_policy": "each-test"}}
        for path in entries:
            if path.startswith(prefix) and ("/checker/" in path or path.rsplit("/", 1)[-1] in {"check.cpp", "checker.cpp"}):
                if path.endswith(("check.cpp", "checker.cpp")):
                    checker = path
                    break
    else:
        # Archives without metadata: infer numbered test/answer pairs.
        pattern = re.compile(re.escape(prefix) + r"(?:tests/)?(\d+)$")
        for name in entries:
            match = pattern.fullmatch(name)
            if match:
                index = int(match.group(1)); answer = name + ".a"
                tests[index] = (name, answer if answer in entries else None, "?", None)
        if tests:
            groups["?"] = {"points": None, "dependencies": [], "points_policy": "each-test"}
        checker = next((p for p in entries if p.startswith(prefix) and p.endswith(("check.cpp", "checker.cpp"))), None)

    # Normalize the type annotation's optional third field.
    normalized: dict[int, tuple[str, str | None, str, float | None]] = {}
    for i, item in tests.items():
        normalized[i] = (item[0], item[1], item[2] if len(item) > 2 else "?", item[3] if len(item) > 3 else None)
    tests = normalized
    suffix = prefix.rstrip("/").split("/")[-1] if prefix.rstrip("/") else str(props.get("name") or "task")
    task_id = f"{archive_path.stem}::{suffix}"
    return Task(task_id, archive_path, prefix, entries, props, xml, tests, groups, checker)


def discover_tasks(archive_paths: list[str] | None = None) -> list[Task]:
    global _TASK_CACHE
    archives = [Path(p).expanduser() for p in archive_paths] if archive_paths else configured_archives()
    if not archives:
        return []
    for archive in archives:
        if not archive.is_file():
            raise ValueError(f"Архив не найден или путь недоступен серверу: {archive}")
        if archive.suffix.lower() not in {".zip", ".rar"}:
            raise ValueError(f"Поддерживаются архивы ZIP и RAR: {archive.name}")
    stamp = tuple((str(p), p.stat().st_mtime_ns) for p in archives if p.is_file())
    if _TASK_CACHE is not None and _TASK_CACHE[0] == stamp:
        return _TASK_CACHE[1]
    found: list[Task] = []
    for archive in archives:
        if not archive.is_file():
            continue
        try:
            entries = archive_entries(archive)
        except Exception as exc:
            print(f"Warning: cannot read {archive}: {exc}", file=sys.stderr)
            continue
        xml_paths = [p for p in entries if p.casefold().endswith("problem.xml")]
        # Expand nested tests.rar archives even when the task also has problem.xml.
        for nested in [p for p in list(entries) if p.lower().endswith("/tests/tests.rar")]:
            try:
                parent = nested.rsplit("/tests/tests.rar", 1)[0] + "/tests/"
                for child, content in rar_entries_from_bytes(entries[nested]).items():
                    entries[parent + child.lstrip("/")] = content
            except Exception as exc:
                print(f"Warning: cannot read nested tests {nested}: {exc}", file=sys.stderr)
        if xml_paths:
            # XML may sit under each task directory or at archive root.
            for xp in xml_paths:
                parent = xp.rsplit("/", 1)[0] + "/" if "/" in xp else ""
                prefix = parent[:-len("files/")] if parent.endswith("files/") else parent
                props = next((p for p in entries if p.startswith(prefix) and p.endswith("problem-properties.json")), None)
                try:
                    found.append(parse_task(archive, entries, prefix, xp, props))
                except Exception as exc:
                    print(f"Warning: cannot parse {xp}: {exc}", file=sys.stderr)
            continue
        xml_paths = [p for p in entries if p.casefold().endswith("problem.xml")]
        # Simple RAR collection with one folder per problem and tests.rar per folder.
        roots = sorted({p.split("/", 1)[0] for p in entries if "/" in p})
        for root in roots:
            nested = next((p for p in entries if p.startswith(root + "/") and p.lower().endswith("/tests/tests.rar")), None)
            if nested:
                try:
                    inner = rar_entries_from_bytes(entries[nested])
                    expanded = dict(entries)
                    for p, data in inner.items():
                        expanded[root + "/tests/" + p.lstrip("/")] = data
                    entries_for_task = expanded
                except Exception as exc:
                    print(f"Warning: cannot read nested tests in {root}: {exc}", file=sys.stderr)
                    entries_for_task = entries
            else:
                entries_for_task = entries
            props = next((p for p in entries if p.startswith(root + "/") and p.endswith("problem-properties.json")), None)
            found.append(parse_task(archive, entries_for_task, root + "/", None, props))
    _TASK_CACHE = (stamp, found)
    return found


def rar_entries_from_bytes(data: bytes) -> dict[str, bytes]:
    with tempfile.NamedTemporaryFile(suffix=".rar") as tmp:
        tmp.write(data); tmp.flush()
        return rar_entries(Path(tmp.name))


def tool_result(value: Any) -> dict[str, Any]:
    text = json.dumps(value, ensure_ascii=False, indent=2)
    return {"content": [{"type": "text", "text": text}], "structuredContent": value}


def err_result(message: str) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": message}], "isError": True}


def task_summary(t: Task) -> dict[str, Any]:
    return {"task_id": t.task_id, "title": t.title, "archive": t.archive.name,
            "tests": len(t.tests), "has_scoring": (any(g["points"] is not None for g in t.groups.values()) or any(x[3] is not None for x in t.tests.values())),
            "groups": list(t.groups)}


def tool_list_tasks(args: dict[str, Any]) -> dict[str, Any]:
    archive_path = args.get("archive_path")
    tasks = discover_tasks([str(archive_path)] if archive_path else None)
    if not tasks:
        raise ValueError("Передай archive_path к ZIP/RAR или задай необязательный список CP_TASK_ARCHIVES.")
    return tool_result([task_summary(t) for t in tasks])


def lookup(task_id: str, archive_path: str | None = None) -> Task:
    for t in discover_tasks([archive_path] if archive_path else None):
        if t.task_id == task_id:
            return t
    raise ValueError(f"Задача {task_id!r} не найдена. Сначала вызови list_tasks.")


def tool_get_task(args: dict[str, Any]) -> dict[str, Any]:
    t = lookup(str(args.get("task_id", "")), args.get("archive_path"))
    p = t.props
    info = {"task_id": t.task_id, "title": t.title,
            "time_limit_ms": t.xml.findtext("judging/testset/time-limit") if t.xml is not None else p.get("timeLimit"),
            "memory_limit_bytes": t.xml.findtext("judging/testset/memory-limit") if t.xml is not None else p.get("memoryLimit"),
            "input": p.get("input"), "output": p.get("output"), "statement": p.get("legend"),
            "notes": p.get("notes"), "scoring": p.get("scoring"), "test_count": len(t.tests)}
    if args.get("include_samples", True):
        info["samples"] = p.get("sampleTests", [])
    return tool_result(info)


def limits_for(task: Task) -> tuple[float, int]:
    tl = task.xml.findtext("judging/testset/time-limit") if task.xml is not None else task.props.get("timeLimit")
    ml = task.xml.findtext("judging/testset/memory-limit") if task.xml is not None else task.props.get("memoryLimit")
    try: seconds = max(0.05, min(float(tl) / 1000, 60))
    except (TypeError, ValueError): seconds = 2.0
    try: memory = max(32, min(int(ml) // (1024 * 1024), 4096))
    except (TypeError, ValueError): memory = 512
    return seconds, memory


def set_limits(memory_mb: int, cpu_seconds: int) -> None:
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
    mem = memory_mb * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (mem, mem))
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_OUTPUT, MAX_OUTPUT))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def run_limited(command: list[str], cwd: str, input_data: bytes, timeout: float, memory_mb: int) -> dict[str, Any]:
    start = time.perf_counter()
    try:
        p = subprocess.run(command, input=input_data, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                           cwd=cwd, timeout=timeout, check=False,
                           preexec_fn=lambda: set_limits(memory_mb, max(1, int(timeout) + 1)))
        elapsed = (time.perf_counter() - start) * 1000
        return {"returncode": p.returncode, "stdout": p.stdout[:MAX_OUTPUT], "stderr": p.stderr[:MAX_OUTPUT],
                "time_ms": round(elapsed, 2), "timeout": False}
    except subprocess.TimeoutExpired as exc:
        return {"returncode": None, "stdout": (exc.stdout or b"")[:MAX_OUTPUT],
                "stderr": (exc.stderr or b"")[:MAX_OUTPUT], "time_ms": round((time.perf_counter()-start)*1000, 2),
                "timeout": True}


def compile_source(source: str, language: str, directory: str) -> tuple[list[str] | None, str | None]:
    if len(source.encode()) > MAX_SOURCE:
        return None, "Исходный код слишком большой (максимум 1 МБ)."
    lang = language.lower()
    if lang in ("cpp", "c++", "cpp17", "c++17"):
        compiler = shutil.which("g++")
        if not compiler:
            return None, "Компилятор g++ не найден."
        source_path = os.path.join(directory, "solution.cpp")
        binary = os.path.join(directory, "solution")
        Path(source_path).write_text(source, encoding="utf-8")
        p = subprocess.run([compiler, "-std=c++17", "-O2", "-pipe", source_path, "-o", binary],
                           cwd=directory, capture_output=True, text=True, timeout=30)
        if p.returncode:
            return None, p.stderr[-6000:] or "Компиляция завершилась с ошибкой."
        return [binary], None
    if lang in ("python", "python3", "py"):
        path = os.path.join(directory, "solution.py")
        Path(path).write_text(source, encoding="utf-8")
        return [sys.executable, path], None
    return None, "Поддерживаются языки C++17 и Python 3."


def compile_checker(task: Task, directory: str) -> tuple[str | None, str | None]:
    if not task.checker:
        return None, None
    compiler = shutil.which("g++")
    if not compiler:
        return None, "g++ недоступен; checker не собран."
    source = os.path.join(directory, "checker.cpp")
    binary = os.path.join(directory, "checker")
    Path(source).write_bytes(task.entries[task.checker])
    include_dirs = []
    prefix = task.prefix
    header = next((content for path, content in task.entries.items() if path.startswith(prefix) and path.endswith("testlib.h")), None)
    if header is None:
        # Several provided packs use the same public testlib header but omit a local copy.
        for other in discover_tasks():
            header = next((content for path, content in other.entries.items() if path.endswith("testlib.h")), None)
            if header is not None:
                break
    if header is not None:
        target = os.path.join(directory, "testlib.h")
        Path(target).write_bytes(header)
        include_dirs.append(directory)
    cmd = [compiler, "-std=c++17", "-O2", "-pipe", *[f"-I{x}" for x in include_dirs], source, "-o", binary]
    p = subprocess.run(cmd, cwd=directory, capture_output=True, text=True, timeout=30)
    if p.returncode:
        return None, "Checker не удалось собрать: " + (p.stderr[-2500:] or "неизвестная ошибка")
    return binary, None


def explain_mismatch(expected: bytes, actual: bytes) -> str:
    e, a = expected.split(), actual.split()
    for i, (x, y) in enumerate(zip(e, a), 1):
        if x != y:
            return f"Ответ отличается от эталона в токене {i}: ожидалось {x[:80]!r}, получено {y[:80]!r}."
    if len(e) != len(a):
        return f"Число элементов ответа отличается: ожидалось {len(e)}, получено {len(a)}."
    return "Вывод отличается от эталонного ответа."


def tool_check_solution(args: dict[str, Any]) -> dict[str, Any]:
    source, language = args.get("source_code"), str(args.get("language", "cpp17"))
    if not isinstance(source, str) or not source.strip():
        raise ValueError("Передай непустой source_code.")
    suffix = ".cpp" if language.lower() in ("cpp", "c++", "cpp17", "c++17") else ".py"
    checker = Path(__file__).resolve().parents[1] / "scripts" / "style_check.py"
    checked = subprocess.run(
        [sys.executable, str(checker), "--stdin", "solution" + suffix],
        input=source.encode("utf-8"), capture_output=True, timeout=10,
    )
    if checked.returncode != 0:
        return {**tool_result({"status": "STYLE_FAIL", "attempted_tests": 0,
                "details": (checked.stdout + checked.stderr).decode("utf-8", "replace")}),
                "isError": True}
    t = lookup(str(args.get("task_id", "")), args.get("archive_path"))
    if not isinstance(source, str) or not source.strip():
        raise ValueError("Передай непустой source_code.")
    if not t.tests:
        raise ValueError("В задаче не найдены тесты.")
    if len(t.tests) > MAX_RUNS:
        raise ValueError(f"В задаче {len(t.tests)} тестов; лимит одного запуска — {MAX_RUNS}.")
    show_failures = bool(args.get("show_failed_tests", False))
    max_shown = max(1, min(int(args.get("max_failed_tests", 3)), 20))
    max_input = max(100, min(int(args.get("max_test_bytes", 4000)), 20000))
    tl, mem = limits_for(t)
    results: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory(prefix="cp-task-check-") as work:
        command, compile_error = compile_source(source, language, work)
        if compile_error:
            not_run_groups = []
            scored = any(g["points"] is not None for g in t.groups.values()) or any(x[3] is not None for x in t.tests.values())
            for name, meta in t.groups.items():
                members = [i for i, item in t.tests.items() if item[2] == name]
                item = {"group": name, "status": "NOT_RUN", "passed_tests": 0,
                        "total_tests": len(members), "failed_tests": []}
                if scored:
                    has_item_points = any(t.tests[i][3] is not None for i in members)
                    maximum = sum(t.tests[i][3] or 0.0 for i in members) if has_item_points else (meta["points"] or 0.0)
                    item.update({"points": maximum, "earned_points": 0.0})
                not_run_groups.append(item)
            response = {"task_id": t.task_id, "title": t.title, "status": "CE",
                        "reason": "Не удалось скомпилировать решение.", "details": compile_error,
                        "passed_tests": 0, "attempted_tests": 0, "total_tests": len(t.tests),
                        "failed_tests": [], "groups": not_run_groups}
            if scored:
                response["score"] = 0.0
                response["maximum_score"] = round(sum(x.get("points", 0.0) for x in not_run_groups), 2)
            return tool_result(response)
        checker, checker_error = compile_checker(t, work)
        checker_mode = checker is not None
        checker_warning = checker_error
        for index in sorted(t.tests):
            input_path, answer_path, group, _test_points = t.tests[index]
            if answer_path is None:
                outcome = {"status": "TEST_DATA_ERROR", "reason": "Для теста отсутствует файл эталонного ответа."}
                results.append({"test": index, "group": group, **outcome})
                continue
            inp, expected = t.entries[input_path], t.entries[answer_path]
            run = run_limited(command, work, inp, tl, mem)
            if run["timeout"]:
                outcome = {"status": "TLE", "reason": f"Превышен лимит времени {tl:g} с."}
            elif run["returncode"] != 0:
                code = run["returncode"]
                if code < 0:
                    try: signal_name = signal.Signals(-code).name
                    except ValueError: signal_name = f"signal {-code}"
                    reason = f"Процесс завершён сигналом {signal_name}; вероятно, превышен лимит памяти или произошёл аварийный сбой."
                elif b"bad_alloc" in run["stderr"] or b"MemoryError" in run["stderr"]:
                    reason = "Программа исчерпала доступную память."
                else:
                    reason = f"Программа завершилась с кодом {code}."
                if run["stderr"]:
                    reason += " stderr: " + decode(run["stderr"])[-1000:]
                outcome = {"status": "MLE" if code < 0 and code == -signal.SIGKILL or b"bad_alloc" in run["stderr"] else "RE", "reason": reason}
            elif checker_mode:
                in_file = os.path.join(work, "input.txt"); out_file = os.path.join(work, "output.txt"); ans_file = os.path.join(work, "answer.txt")
                Path(in_file).write_bytes(inp); Path(out_file).write_bytes(run["stdout"]); Path(ans_file).write_bytes(expected)
                checked = run_limited([checker, in_file, out_file, ans_file], work, b"", max(2.0, tl), min(mem, 1024))
                if checked["returncode"] == 0:
                    outcome = {"status": "AC", "reason": "Ответ принят checker’ом."}
                else:
                    detail = decode(checked["stderr"] or checked["stdout"]).strip()
                    outcome = {"status": "WA", "reason": detail or explain_mismatch(expected, run["stdout"])}
            elif run["stdout"].split() == expected.split():
                outcome = {"status": "AC", "reason": "Вывод совпадает с эталоном."}
            else:
                outcome = {"status": "WA", "reason": explain_mismatch(expected, run["stdout"])}
            details = {}
            if show_failures and outcome["status"] != "AC":
                details = {"input": decode(inp)[:max_input], "input_truncated": len(inp) > max_input,
                           "expected_output": decode(expected)[:2000], "actual_output": decode(run["stdout"])[:2000]}
            results.append({"test": index, "group": group, "time_ms": run["time_ms"], **outcome, **details})

    passed = sum(x["status"] == "AC" for x in results)
    failures = [x for x in results if x["status"] != "AC"]
    group_reports = []
    has_test_points = any(item[3] is not None for item in t.tests.values())
    all_have_points = bool(t.groups) and (any(g["points"] is not None for g in t.groups.values()) or has_test_points)
    earned = 0.0
    for name, meta in t.groups.items():
        group_tests = [x for x in results if x["group"] == name]
        group_passed = sum(x["status"] == "AC" for x in group_tests)
        report = {"group": name, "passed_tests": group_passed, "total_tests": len(group_tests),
                  "failed_tests": [x["test"] for x in group_tests if x["status"] != "AC"]}
        if all_have_points:
            points = meta["points"]
            deps_ok = all(all(x["status"] == "AC" for x in results if x["group"] == dep) for dep in meta["dependencies"])
            test_points = [t.tests[x["test"]][3] for x in group_tests]
            has_group_test_points = any(x is not None for x in test_points)
            maximum = sum(x or 0.0 for x in test_points) if has_group_test_points else (points or 0.0)
            if has_group_test_points:
                score = sum(t.tests[x["test"]][3] or 0.0 for x in group_tests if x["status"] == "AC") if deps_ok else 0.0
            else:
                score = (points or 0.0) if group_tests and group_passed == len(group_tests) and deps_ok else 0.0
            report.update({"points": maximum, "earned_points": score})
            earned += score
        group_reports.append(report)
    response: dict[str, Any] = {"task_id": t.task_id, "title": t.title,
        "status": "AC" if not failures else failures[0]["status"], "passed_tests": passed,
        "attempted_tests": len(results), "total_tests": len(t.tests), "failed_tests": [x["test"] for x in failures],
        "groups": group_reports, "checker_used": checker_mode}
    if checker_warning:
        response["checker_note"] = checker_warning + " Сравнение выполнено по токенам эталонного ответа."
    if all_have_points:
        response["score"] = round(earned, 2)
        response["maximum_score"] = round(sum(g.get("points") or sum(t.tests[x][3] or 0.0 for x in t.tests if t.tests[x][2] == name) for name, g in t.groups.items()), 2)
    if failures:
        first = failures[0]
        response["first_failure"] = {k: first.get(k) for k in ("test", "group", "status", "reason", "time_ms", "input", "input_truncated") if k in first}
        response["failure_details"] = failures[:max_shown]
        response["failure_details_truncated"] = len(failures) > max_shown
    return tool_result(response)


TOOLS = [
    {"name": "list_tasks", "description": "Прочитать переданный архив и показать содержащиеся в нём задачи. Передай archive_path к ZIP/RAR, доступному MCP-серверу. Если путь опущен, используются только необязательные пути CP_TASK_ARCHIVES.", "inputSchema": {"type": "object", "properties": {"archive_path": {"type": "string", "description": "Локальный путь к переданному .zip или .rar архиву"}}}},
    {"name": "get_task", "description": "Прочитать условие из переданного архива. archive_path — локальный путь к ZIP/RAR, доступному MCP-серверу.", "inputSchema": {"type": "object", "properties": {"archive_path": {"type": "string"}, "task_id": {"type": "string"}, "include_samples": {"type": "boolean", "default": True}}, "required": ["archive_path", "task_id"]}},
    {"name": "check_solution", "description": "Только по явному запросу пользователя, после внешнего style-check PASS. Общий style-check повторяется сервером; при FAIL компиляция и тесты запрещены. Прочитать задачу из переданного архива, скомпилировать решение и запустить тесты; вернуть результат по группам, баллы при наличии разбаловки и объяснение первой ошибки.", "inputSchema": {"type": "object", "properties": {"archive_path": {"type": "string", "description": "Локальный путь к переданному .zip или .rar архиву"}, "task_id": {"type": "string"}, "source_code": {"type": "string"}, "language": {"type": "string", "enum": ["cpp17", "python3"], "default": "cpp17"}, "show_failed_tests": {"type": "boolean", "default": False}, "max_failed_tests": {"type": "integer", "default": 3}, "max_test_bytes": {"type": "integer", "default": 4000}}, "required": ["archive_path", "task_id", "source_code"]}},
]


def rpc_response(req_id: Any, result: Any = None, error: Any = None) -> dict[str, Any]:
    if error is not None:
        return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32000, "message": str(error)}}
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def handle(req: dict[str, Any]) -> dict[str, Any] | None:
    method, params, req_id = req.get("method"), req.get("params") or {}, req.get("id")
    if method == "notifications/initialized" or method == "notifications/cancelled":
        return None
    if method == "initialize":
        return rpc_response(req_id, {"protocolVersion": params.get("protocolVersion", "2024-11-05"),
            "capabilities": {"tools": {"listChanged": False}}, "serverInfo": {"name": "cp-tasks-mcp", "version": "1.0.0"}})
    if method == "ping":
        return rpc_response(req_id, {})
    if method == "tools/list":
        return rpc_response(req_id, {"tools": TOOLS})
    if method == "tools/call":
        args = params.get("arguments") or {}
        try:
            name = params.get("name")
            if name == "list_tasks": result = tool_list_tasks(args)
            elif name == "get_task": result = tool_get_task(args)
            elif name == "check_solution": result = tool_check_solution(args)
            else: return rpc_response(req_id, error=f"Неизвестный инструмент: {name}")
            return rpc_response(req_id, result)
        except Exception as exc:
            return rpc_response(req_id, error=str(exc))
    if req_id is not None:
        return rpc_response(req_id, error=f"Неизвестный метод: {method}")
    return None


def main() -> None:
    # MCP stdio transport uses newline-delimited JSON-RPC messages.
    for line in sys.stdin:
        try:
            req = json.loads(line)
            response = handle(req)
            if response is not None:
                sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
                sys.stdout.flush()
        except Exception as exc:
            sys.stdout.write(json.dumps(rpc_response(None, error=exc), ensure_ascii=False) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
