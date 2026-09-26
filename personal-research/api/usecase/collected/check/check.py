from __future__ import annotations

from usecase.common import store


# #
# check

def run() -> tuple[list[str], int, int]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT collected.path, collected_content.language, MAX(collected_content.version)
               FROM collected_content
               JOIN collected ON collected.id = collected_content.collected_id
               GROUP BY collected_content.collected_id, collected_content.language"""
        ).fetchall()
        recorded = {row[0] for row in connection.execute("SELECT path FROM collected")}
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
        if path.endswith(store.DOCUMENT_SUFFIX)
    ]

    return problems, len(english), len(korean)
