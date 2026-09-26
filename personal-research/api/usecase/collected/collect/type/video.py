from __future__ import annotations

import datetime
import json
import os
import subprocess
import tempfile
from pathlib import Path

from usecase.common import store

MODEL = "large-v3-turbo"


# #
# get

def get(*, url: str) -> store.Document:
    token = hf_token()
    with tempfile.TemporaryDirectory() as folder:
        work = Path(folder)
        subprocess.run(
            ["yt-dlp", "-f", "bestaudio", "-x", "--audio-format", "m4a",
             "-o", str(work / "audio.%(ext)s"),
             "--print-to-file", "%(title)s\n%(channel)s", str(work / "meta.txt"),
             url],
            check=True,
        )
        title, channel = (work / "meta.txt").read_text().strip().split("\n")
        subprocess.run(
            ["whisperx", str(work / "audio.m4a"),
             "--model", MODEL, "--language", "en", "--compute_type", "int8",
             "--diarize", "--hf_token", token,
             "--output_format", "json", "--output_dir", str(work)],
            check=True,
        )
        result = json.loads((work / "audio.json").read_text())
    document = store.Document(
        path=f"videos/youtube/{store.slugify(title=title)}.md",
        body=to_markdown(result=result, title=title),
        url=url,
        extra={
            "channel": channel,
            "fetched": store.today(),
            "via": f"yt-dlp + whisperx {MODEL} + pyannote diarization",
        },
    )

    return document


def hf_token() -> str:
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    cached = Path.home() / ".cache" / "huggingface" / "token"
    if not token and cached.exists():
        token = cached.read_text().strip()
    if not token:
        raise ValueError("HF 토큰이 없다: HF_TOKEN 이나 ~/.cache/huggingface/token 에 둔다")

    return token


# #
# render

def hms(*, seconds: float) -> str:
    return str(datetime.timedelta(seconds=int(seconds)))


def to_markdown(*, result: dict, title: str) -> str:
    lines = [f"# {title}", ""]
    speaker, start, texts = None, None, []
    for segment in result["segments"]:
        current = segment.get("speaker", "UNKNOWN")
        if current != speaker:
            if texts:
                lines += [f"**[{hms(seconds=start)}] {speaker}:** {' '.join(texts)}", ""]
            speaker, start, texts = current, segment["start"], []
        texts.append(segment["text"].strip())
    if texts:
        lines += [f"**[{hms(seconds=start)}] {speaker}:** {' '.join(texts)}", ""]

    return "\n".join(lines)
