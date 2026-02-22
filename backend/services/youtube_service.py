"""YouTube transcript extraction service."""

import re
import os
import base64
import tempfile
import logging
from http.cookiejar import MozillaCookieJar
from youtube_transcript_api import YouTubeTranscriptApi

logger = logging.getLogger(__name__)

# ── Module-level cookie temp file path (kept alive for the process lifetime) ──
_cookie_tmp_path: str | None = None


def _ensure_cookie_file() -> str | None:
    """Write YOUTUBE_COOKIES env var (base64) to a temp file once.

    Returns the path to the temp cookie file, or None if the env var is not set.
    The file is written once per process and reused across requests.
    """
    global _cookie_tmp_path

    if _cookie_tmp_path and os.path.isfile(_cookie_tmp_path):
        logger.info("Reusing existing cookie file: %s", _cookie_tmp_path)
        return _cookie_tmp_path

    cookies_b64 = os.getenv("YOUTUBE_COOKIES", "")
    if not cookies_b64:
        logger.warning("YOUTUBE_COOKIES env var is not set or empty")
        return None

    logger.info("YOUTUBE_COOKIES env var found (length=%d), decoding...", len(cookies_b64))

    try:
        raw = base64.b64decode(cookies_b64)
        logger.info("Decoded cookie data: %d bytes", len(raw))

        # /tmp is writable on Vercel serverless
        tmp_path = os.path.join(tempfile.gettempdir(), "yt_cookies.txt")
        with open(tmp_path, "wb") as f:
            f.write(raw)

        # Verify file was written
        if os.path.isfile(tmp_path):
            logger.info("Cookie file written successfully to %s (%d bytes)", tmp_path, os.path.getsize(tmp_path))
            _cookie_tmp_path = tmp_path
            return _cookie_tmp_path
        else:
            logger.error("Cookie file was NOT created at %s", tmp_path)
            return None
    except Exception as e:
        logger.error("Failed to decode/write YOUTUBE_COOKIES: %s", str(e))
        return None


def _load_cookie_jar(path: str) -> MozillaCookieJar | None:
    """Load a Netscape/Mozilla cookie file into a MozillaCookieJar."""
    try:
        jar = MozillaCookieJar(path)
        jar.load(ignore_discard=True, ignore_expires=True)
        cookie_count = len(jar)
        logger.info("Loaded %d cookies from %s", cookie_count, path)
        return jar
    except Exception as e:
        logger.error("Failed to load cookie jar from %s: %s", path, str(e))
        return None


def _build_api() -> YouTubeTranscriptApi:
    """Build a YouTubeTranscriptApi instance, using cookies if available.

    Cookies are tried in this order:
    1. YOUTUBE_COOKIES env var (base64-encoded cookies.txt content) — for cloud
    2. backend/cookies.txt file — for local development
    3. No cookies (plain API) — fallback
    """
    import requests as req_lib

    # ── Method 1: env var (base64-encoded cookies.txt content) ──────────────
    env_cookie_path = _ensure_cookie_file()
    if env_cookie_path:
        jar = _load_cookie_jar(env_cookie_path)
        if jar and len(jar) > 0:
            session = req_lib.Session()
            for cookie in jar:
                session.cookies.set_cookie(cookie)
            logger.info("Using cookies from env var (%d cookies loaded into session)", len(session.cookies))
            return YouTubeTranscriptApi(http_client=session)
        else:
            logger.warning("Cookie jar from env var was empty or failed to load")

    # ── Method 2: local cookies.txt file ───────────────────────────────────
    local_cookie_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "cookies.txt"
    )
    if os.path.isfile(local_cookie_path):
        jar = _load_cookie_jar(local_cookie_path)
        if jar and len(jar) > 0:
            session = req_lib.Session()
            for cookie in jar:
                session.cookies.set_cookie(cookie)
            logger.info("Using cookies from local file (%d cookies loaded into session)", len(session.cookies))
            return YouTubeTranscriptApi(http_client=session)
        else:
            logger.warning("Local cookie jar was empty or failed to load")

    # ── Method 3: no cookies ──────────────────────────────────────────────
    logger.warning("No cookies available — using plain YouTubeTranscriptApi (may be blocked on cloud)")
    return YouTubeTranscriptApi()


def get_cookie_status() -> dict:
    """Return diagnostic info about cookie configuration (for debug endpoint)."""
    env_var = os.getenv("YOUTUBE_COOKIES", "")
    local_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "cookies.txt"
    )

    status = {
        "env_var_set": bool(env_var),
        "env_var_length": len(env_var) if env_var else 0,
        "local_file_exists": os.path.isfile(local_path),
        "tmp_file_path": _cookie_tmp_path,
        "tmp_file_exists": bool(_cookie_tmp_path and os.path.isfile(_cookie_tmp_path)),
        "tmp_dir": tempfile.gettempdir(),
        "tmp_dir_writable": os.access(tempfile.gettempdir(), os.W_OK),
    }

    # Try loading cookies to report count
    if env_var:
        try:
            raw = base64.b64decode(env_var)
            status["env_var_decoded_length"] = len(raw)
            status["env_var_first_line"] = raw.decode("utf-8", errors="replace").split("\n")[0][:80]
        except Exception as e:
            status["env_var_decode_error"] = str(e)

    return status


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
    last_error = None

    for languages in [["en"], ["hi"], ["es", "fr", "de", "pt", "ja", "ko", "zh"]]:
        try:
            transcript = ytt_api.fetch(video_id, languages=languages)
            break
        except Exception as e:
            last_error = e
            logger.debug("Failed to fetch transcript for languages %s: %s", languages, str(e))
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
        except Exception as e:
            last_error = e
            logger.error("Failed to list/fetch any transcript: %s", str(e))

    if transcript is None:
        cookie_status = get_cookie_status()
        error_detail = (
            f"No transcripts found for video {video_id}. "
            f"Last error: {str(last_error) if last_error else 'unknown'}. "
            f"Cookie status: env_var_set={cookie_status['env_var_set']}, "
            f"local_file={cookie_status['local_file_exists']}, "
            f"tmp_file={cookie_status['tmp_file_exists']}."
        )
        logger.error(error_detail)
        raise RuntimeError(error_detail)

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
