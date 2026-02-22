"""YouTube transcript extraction service."""

import re
import os
import base64
import tempfile
from http.cookiejar import MozillaCookieJar
from youtube_transcript_api import YouTubeTranscriptApi


# ── Module-level cookie temp file path (kept alive for the process lifetime) ──
_cookie_tmp_path: str | None = None


def _ensure_cookie_file() -> str | None:
    """Write YOUTUBE_COOKIES env var (base64) to a temp file once.

    Returns the path to the temp cookie file, or None if the env var is not set.
    The file is written once per process and reused across requests.
    """
    global _cookie_tmp_path

    if _cookie_tmp_path and os.path.isfile(_cookie_tmp_path):
        return _cookie_tmp_path

    cookies_b64 = os.getenv("YOUTUBE_COOKIES", "")
    if not cookies_b64:
        return None

    try:
        raw = base64.b64decode(cookies_b64)
        # /tmp is writable on Vercel serverless
        tmp_path = os.path.join(tempfile.gettempdir(), "yt_cookies.txt")
        with open(tmp_path, "wb") as f:
            f.write(raw)
        _cookie_tmp_path = tmp_path
        return _cookie_tmp_path
    except Exception:
        return None


def _load_cookie_jar(path: str) -> MozillaCookieJar | None:
    """Load a Netscape/Mozilla cookie file into a MozillaCookieJar."""
    try:
        jar = MozillaCookieJar(path)
        jar.load(ignore_discard=True, ignore_expires=True)
        return jar
    except Exception:
        return None


def _build_api() -> YouTubeTranscriptApi:
    """Build a YouTubeTranscriptApi instance, using cookies if available.

    Cookies are tried in this order:
    1. YOUTUBE_COOKIES env var (base64-encoded cookies.txt content) — for cloud
    2. backend/cookies.txt file — for local development
    3. No cookies (plain API) — fallback

    On cloud platforms YouTube often blocks requests from datacenter IPs.
    Providing cookies lets the library authenticate as a real user.
    """
    import requests as req_lib

    # ── Method 1: env var (base64-encoded cookies.txt content) ──────────────
    env_cookie_path = _ensure_cookie_file()
    if env_cookie_path:
        jar = _load_cookie_jar(env_cookie_path)
        if jar:
            session = req_lib.Session()
            session.cookies = jar  # type: ignore[assignment]
            return YouTubeTranscriptApi(http_client=session)

    # ── Method 2: local cookies.txt file ───────────────────────────────────
    local_cookie_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "cookies.txt"
    )
    if os.path.isfile(local_cookie_path):
        jar = _load_cookie_jar(local_cookie_path)
        if jar:
            session = req_lib.Session()
            session.cookies = jar  # type: ignore[assignment]
            return YouTubeTranscriptApi(http_client=session)

    # ── Method 3: no cookies ──────────────────────────────────────────────
    return YouTubeTranscriptApi()


def extract_video_id(url: str) -> str:
    """Extract video ID from various YouTube URL formats."""
    patterns = [
        r"(?:youtube\.com\/watch\?v=)([\w-]{11})",
        r"(?:youtu\.be\/)([\w-]{11})",
        r"(?:youtube\.com\/embed\/)([\w-]{11})",
        r"(?:youtube\.com\/v\/)([\w-]{11})",
        r"(?:youtube\.com\/shorts\/)([\w-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


def get_transcript(url: str) -> dict:
    """Fetch YouTube transcript and return structured result.

    Tries English first, then falls back to any available language.

    Returns:
        dict with keys: video_id, transcript_text, segment_count
    """
    video_id = extract_video_id(url)

    ytt_api = _build_api()

    # Try fetching transcript - first English, then any available language
    transcript = None
    languages_tried = []

    for languages in [["en"], ["hi"], ["es", "fr", "de", "pt", "ja", "ko", "zh"]]:
        try:
            transcript = ytt_api.fetch(video_id, languages=languages)
            break
        except Exception:
            languages_tried.extend(languages)
            continue

    # If specific languages failed, try fetching any available transcript
    if transcript is None:
        try:
            transcript_list = ytt_api.list(video_id)
            if transcript_list:
                first_available = transcript_list[0]
                lang_code = (
                    first_available.language_code
                    if hasattr(first_available, "language_code")
                    else "en"
                )
                transcript = ytt_api.fetch(video_id, languages=[lang_code])
        except Exception:
            pass

    if transcript is None:
        raise RuntimeError(
            f"No transcripts found for video {video_id}. "
            f"The video may not have subtitles/captions enabled. "
            f"If you are running on a cloud server, YouTube may be blocking requests — "
            f"try adding a cookies.txt file to the backend/ directory."
        )

    # Extract text from transcript segments
    segments = transcript.snippets if hasattr(transcript, "snippets") else transcript
    texts = []
    count = 0
    for segment in segments:
        text = (
            segment.text
            if hasattr(segment, "text")
            else (segment.get("text", "") if isinstance(segment, dict) else "")
        )
        if text:
            texts.append(text)
            count += 1

    transcript_text = " ".join(texts)

    # Clean up whitespace
    transcript_text = re.sub(r"\s+", " ", transcript_text).strip()

    if not transcript_text:
        raise RuntimeError(f"Transcript for video {video_id} is empty.")

    return {
        "video_id": video_id,
        "transcript_text": transcript_text,
        "segment_count": count,
    }
