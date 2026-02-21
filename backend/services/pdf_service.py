"""PDF text extraction service."""

import io
from PyPDF2 import PdfReader


def extract_text_from_pdf(file_bytes: bytes) -> dict:
    """Extract text from a PDF file.

    Args:
        file_bytes: Raw bytes of the uploaded PDF file.

    Returns:
        dict with keys: text, page_count
    """
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as e:
        raise RuntimeError(f"Failed to read PDF file: {e}")

    if len(reader.pages) == 0:
        raise ValueError("The PDF file contains no pages.")

    pages_text: list[str] = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            pages_text.append(text.strip())

    full_text = "\n\n".join(pages_text)

    if not full_text.strip():
        raise ValueError(
            "Could not extract any text from the PDF. "
            "The file may be image-based or scanned."
        )

    return {
        "text": full_text,
        "page_count": len(reader.pages),
        "extracted_pages": len(pages_text),
    }
