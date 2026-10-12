from __future__ import annotations

from usecase.collected.record import record as documents


# #
# check

def run() -> tuple[list[str], int, int]:
    rows = documents.versions()
    recorded = documents.paths()
    english = {path: number for path, language, number in rows if language == "eng"}
    korean = {path: number for path, language, number in rows if language == "kor"}
    problems = []
    for path, number in sorted(korean.items()):
        if path not in english:
            problems.append(f"원문 없음: kor {path}")
        elif number < english[path]:
            problems.append(f"번역 낡음: {path} (번역 {number}판, 현재 {english[path]}판)")
    problems += [
        f"원문 없는 메타: {path}"
        for path in sorted(recorded - set(english))
        if path.endswith(documents.DOCUMENT_SUFFIX)
    ]

    return problems, len(english), len(korean)
