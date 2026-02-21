"""YouTube transcript extraction service."""

import re
from youtube_transcript_api import YouTubeTranscriptApi


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

    ytt_api = YouTubeTranscriptApi()

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
                # Get the first available transcript
                first_available = transcript_list[0]
                lang_code = first_available.language_code if hasattr(first_available, 'language_code') else 'en'
                transcript = ytt_api.fetch(video_id, languages=[lang_code])
        except Exception:
            pass

    if transcript is None:
        raise RuntimeError(
            f"No transcripts found for video {video_id}. "
            f"The video may not have subtitles/captions enabled."
        )

    # Extract text from transcript segments
    segments = transcript.snippets if hasattr(transcript, 'snippets') else transcript
    texts = []
    count = 0
    for segment in segments:
        text = segment.text if hasattr(segment, 'text') else (segment.get("text", "") if isinstance(segment, dict) else "")
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
