"""YouTube transcript extraction service — Version-compatible for 0.6.2."""

import re
import os
import base64
import tempfile
import logging
import requests
from http.cookiejar import MozillaCookieJar
from youtube_transcript_api import YouTubeTranscriptApi

logger = logging.getLogger(__name__)

# ── Module-level cookie temp file path ──
_cookie_tmp_path: str | None = None


def _ensure_cookie_file() -> str | None:
    """Write YOUTUBE_COOKIES env var (base64) to a temp file once.

    Returns the path to the temp cookie file, or None if the env var is not set.
    """
    global _cookie_tmp_path

    # Check if we already have it
    if _cookie_tmp_path and os.path.isfile(_cookie_tmp_path):
        return _cookie_tmp_path

    # 1. Try env var
    cookies_b64 = os.getenv("YOUTUBE_COOKIES", "")
    if cookies_b64:
        try:
            raw = base64.b64decode(cookies_b64)
            tmp_path = os.path.join(tempfile.gettempdir(), "yt_cookies.txt")
            with open(tmp_path, "wb") as f:
                f.write(raw)
            if os.path.isfile(tmp_path):
                _cookie_tmp_path = tmp_path
                logger.info("Created temp cookie file from env var: %s", tmp_path)
                return _cookie_tmp_path
        except Exception as e:
            logger.error("Failed to decode/write YOUTUBE_COOKIES env: %s", str(e))

    # 2. Try local file (backend/cookies.txt)
    local_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "cookies.txt"
    )
    if os.path.isfile(local_path):
        logger.info("Found local cookies.txt at %s", local_path)
        return local_path

    return None


def get_cookie_status() -> dict:
    """Return diagnostic info about cookie configuration."""
    # Proactively try to ensure the cookie file exists for debugging
    path = _ensure_cookie_file()
    
    env_var = os.getenv("YOUTUBE_COOKIES", "")
    local_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "cookies.txt"
    )

    status = {
        "env_var_set": bool(env_var),
        "env_var_length": len(env_var) if env_var else 0,
        "local_file_exists": os.path.isfile(local_path),
        "tmp_file_path": path,
        "tmp_file_exists": bool(path and os.path.isfile(path)),
        "tmp_dir": tempfile.gettempdir(),
        "tmp_dir_writable": os.access(tempfile.gettempdir(), os.W_OK),
    }

    if env_var:
        try:
            raw = base64.b64decode(env_var)
            status["env_var_decoded_length"] = len(raw)
            # Peek at the file content
            content_peek = raw.decode("utf-8", errors="replace")[:100]
            status["env_var_peek"] = content_peek
        except Exception as e:
            status["env_var_decode_error"] = str(e)

    return status


def extract_video_id(url: str) -> str:
    """Extract 11-char video ID from various YouTube URL formats."""
    patterns = [
        r"(?:youtube\.com\/watch\?v=)([\w-]{11})",
        r"(?:youtu\.be\/)([\w-]{11})",
        r"(?:youtube\.com\/embed\/)([\w-]{11})",
        r"(?:youtube\.com\/v\/)([\w-]{11})",
        r"(?:youtube\.com\/shorts\/)([\w-]{11})",
        r"^([\w-]{11})$",  # Direct ID
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


def get_transcript(url: str) -> dict:
    """Fetch YouTube transcript using instance-based methods for compatibility.
    
    Compatible with youtube-transcript-api v0.6.2 and above.
    """
    video_id = extract_video_id(url)
    cookie_path = _ensure_cookie_file()
    
    logger.info("Fetching transcript for %s (cookies=%s)", video_id, bool(cookie_path))

    # Manual session management for cookies
    session = requests.Session()
    if cookie_path:
        try:
            jar = MozillaCookieJar(cookie_path)
            jar.load(ignore_discard=True, ignore_expires=True)
            session.cookies = jar
            logger.info("Loaded cookies into session from %s", cookie_path)
        except Exception as e:
            logger.error("Failed to load cookies into session: %s", str(e))

    # Instantiate API with custom session
    api = YouTubeTranscriptApi(http_client=session)
    
    transcript_data = None
    last_error = None

    try:
        # Using instance.list(video_id) instead of static list_transcripts
        transcript_list = api.list(video_id)
        
        # Preference: Manual English -> Generated English -> First available
        try:
            transcript = transcript_list.find_transcript(['en'])
        except Exception:
            try:
                # Fallback to any language (first available)
                transcript = next(iter(transcript_list))
            except Exception as e:
                raise RuntimeError(f"No transcripts available for this video: {str(e)}")

        # Fetch the actual data
        transcript_data = transcript.fetch()
        
    except Exception as e:
        last_error = e
        logger.error("Transcript fetch failed for %s: %s", video_id, str(e))

    if not transcript_data:
        cookie_status = get_cookie_status()
        error_msg = (
            f"Could not find transcripts for video {video_id}. "
            f"Error: {str(last_error)}. "
            f"Diagnostic: env_var={cookie_status['env_var_set']}, "
            f"tmp_file={cookie_status['tmp_file_exists']}, "
            f"local_file={cookie_status['local_file_exists']}."
        )
        raise RuntimeError(error_msg)

    # Process segments
    texts = [segment.get("text", "") for segment in transcript_data if "text" in segment]
    transcript_text = " ".join(texts)
    transcript_text = re.sub(r"\s+", " ", transcript_text).strip()

    if not transcript_text:
        raise RuntimeError(f"Transcript for video {video_id} is empty.")

    return {
        "video_id": video_id,
        "transcript_text": transcript_text,
        "segment_count": len(transcript_data),
    }
