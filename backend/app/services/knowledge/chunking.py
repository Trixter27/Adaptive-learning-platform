"""Code-aware units adapted from A/AJ knowledge/chunker.py; never cross locations."""

import re

MAX_CHARS = 1400

CODE_RE = re.compile(
    r"^\s*(#include|using\s+namespace|//|/\*|\*/|"
    r"(for|while|if|switch)\s*\(|else\b|return\b|"
    r"(int|double|float|char|bool|void)\s+\w+|"
    r"cout\b|cin\b|[{}]\s*$|\d+(\s+\d+)+\s*$)"
)


def is_code(line: str) -> bool:
    s = line.rstrip()
    return (
        bool(CODE_RE.match(s))
        or s.endswith((";", "{", "}"))
        or bool(re.search(r";\s*//", s))  # statement followed by a trailing comment
    )


def split_long(txt: str, kind: str) -> list[str]:
    if len(txt) <= MAX_CHARS:
        return [txt]
    parts = txt.split("\n") if kind == "code" else re.split(r"(?<=[.!?:])\s+|\n", txt)
    out, cur = [], ""
    for part in parts:
        while len(part) > MAX_CHARS:
            if cur:
                out.append(cur)
                cur = ""
            out.append(part[:MAX_CHARS])
            part = part[MAX_CHARS:]
        if cur and len(cur) + len(part) + 1 > MAX_CHARS:
            out.append(cur)
            cur = part
        else:
            cur = f"{cur}\n{part}" if cur else part
    if cur:
        out.append(cur)
    return out


def to_units(text: str) -> list[str]:
    blocks: list[list] = []
    cur_kind, cur_lines = None, []

    def flush():
        nonlocal cur_kind, cur_lines
        if cur_lines:
            sep = "\n" if cur_kind == "code" else " "
            blocks.append([cur_kind, sep.join(cur_lines)])
        cur_kind, cur_lines = None, []

    for raw in text.split("\n"):
        s = raw.strip()
        if not s:
            if cur_kind == "prose":
                flush()
            continue
        kind = "code" if is_code(raw) else "prose"
        if kind != cur_kind:
            flush()
            cur_kind = kind
        cur_lines.append(raw.rstrip() if kind == "code" else s)
        if kind == "prose" and s.endswith((".", "!", "?", ":")):
            flush()
    flush()

    units: list[list] = []
    for kind, txt in blocks:
        units.append([kind, txt])
        while len(units) >= 2:
            prev, last = units[-2], units[-1]
            glue = prev[0] == "prose" and (
                prev[1].endswith(":")
                or (
                    last[0] == "code"
                    and len(prev[1]) < 60
                    and not prev[1].endswith((".", "!", "?"))
                )
            )
            if not glue:
                break
            units[-2:] = [[last[0], prev[1] + "\n" + last[1]]]

    out: list[str] = []
    for kind, txt in units:
        out.extend(split_long(txt, kind))
    return out


def chunk_text(text: str) -> list[str]:
    chunks = []
    current = ""
    for unit in to_units(text):
        if current and len(current) + len(unit) + 1 > MAX_CHARS:
            chunks.append(current)
            current = ""
        current = f"{current}\n{unit}" if current else unit
    if current:
        chunks.append(current)
    return chunks
