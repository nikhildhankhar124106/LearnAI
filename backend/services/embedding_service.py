"""Embedding and vector store service using local TF-IDF embeddings.

Uses scikit-learn TF-IDF vectorizer for embeddings — runs locally
with no external API calls needed. Stores vectors in memory with
JSON file persistence.
"""

import uuid
import json
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import CHROMA_PERSIST_DIR, CHUNK_SIZE, CHUNK_OVERLAP, RAG_TOP_K

# ── In-Memory Vector Store ────────────────────────────────────────────────
_store: dict[str, dict] = {}
_STORE_PATH = os.path.join(CHROMA_PERSIST_DIR, "vector_store.json")


def _save_store():
    """Persist vector store to disk."""
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    serializable = {}
    for cid, data in _store.items():
        serializable[cid] = {
            "chunks": data["chunks"],
            "metadatas": data["metadatas"],
        }
    with open(_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(serializable, f)


def _load_store():
    """Load vector store from disk if available."""
    global _store
    if os.path.exists(_STORE_PATH):
        try:
            with open(_STORE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            for cid, val in data.items():
                _store[cid] = {
                    "chunks": val["chunks"],
                    "metadatas": val["metadatas"],
                }
        except Exception:
            _store = {}


# Load existing data on startup
_load_store()


# ── Text splitter ─────────────────────────────────────────────────────────
_text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_and_store(text: str, source_type: str, source_info: str) -> dict:
    """Chunk text and store. Embeddings are computed on-the-fly during retrieval.

    Args:
        text: Full text content to process.
        source_type: 'youtube' or 'pdf'.
        source_info: Video ID or filename.

    Returns:
        dict with content_id, chunk_count, and preview of text.
    """
    content_id = str(uuid.uuid4())[:8]

    # Split text into chunks
    chunks = _text_splitter.split_text(text)

    if not chunks:
        raise ValueError("Text produced zero chunks after splitting.")

    # Store chunks (no embedding API call needed!)
    metadatas = [
        {
            "source_type": source_type,
            "source_info": source_info,
            "chunk_index": i,
        }
        for i in range(len(chunks))
    ]

    _store[content_id] = {
        "chunks": chunks,
        "metadatas": metadatas,
    }

    # Persist to disk
    _save_store()

    return {
        "content_id": content_id,
        "chunk_count": len(chunks),
        "preview": text[:500] + ("..." if len(text) > 500 else ""),
    }


def retrieve_relevant_chunks(content_id: str, query: str, top_k: int = None) -> list[str]:
    """Retrieve top-k most relevant chunks using TF-IDF cosine similarity.

    Uses scikit-learn's TF-IDF vectorizer — fast, local, no API needed.

    Returns:
        List of chunk texts ordered by relevance.
    """
    if top_k is None:
        top_k = RAG_TOP_K

    if content_id not in _store:
        raise ValueError(f"No content found for content_id: {content_id}")

    chunks = _store[content_id]["chunks"]

    if not chunks:
        raise ValueError(f"No content found for content_id: {content_id}")

    # Build TF-IDF matrix from chunks + query
    vectorizer = TfidfVectorizer(stop_words="english")
    all_texts = chunks + [query]
    tfidf_matrix = vectorizer.fit_transform(all_texts)

    # Compute similarity between query (last) and all chunks
    query_vec = tfidf_matrix[-1]
    chunk_vecs = tfidf_matrix[:-1]
    similarities = cosine_similarity(query_vec, chunk_vecs).flatten()

    # Get top-k indices
    top_indices = similarities.argsort()[::-1][:top_k]

    return [chunks[i] for i in top_indices]


def get_all_chunks(content_id: str) -> list[str]:
    """Retrieve all chunks for a content piece (for flashcard/quiz generation)."""
    if content_id not in _store:
        raise ValueError(f"No content found for content_id: {content_id}")

    return _store[content_id]["chunks"]
