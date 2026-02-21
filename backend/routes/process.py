"""Routes for content processing: YouTube videos and PDF files."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, HttpUrl

from services.youtube_service import get_transcript
from services.pdf_service import extract_text_from_pdf
from services.embedding_service import chunk_and_store

router = APIRouter()


class ProcessVideoRequest(BaseModel):
    url: str


class ProcessResponse(BaseModel):
    content_id: str
    chunk_count: int
    preview: str
    source_type: str
    message: str


@router.post("/process-video", response_model=ProcessResponse)
async def process_video(request: ProcessVideoRequest):
    """Process a YouTube video: extract transcript, chunk, and embed."""
    try:
        # Step 1: Extract transcript
        result = get_transcript(request.url)
        transcript_text = result["transcript_text"]
        video_id = result["video_id"]

        if not transcript_text.strip():
            raise HTTPException(
                status_code=422,
                detail="The video transcript is empty. The video might not have captions.",
            )

        # Step 2: Chunk and store embeddings
        store_result = chunk_and_store(
            text=transcript_text,
            source_type="youtube",
            source_info=video_id,
        )

        return ProcessResponse(
            content_id=store_result["content_id"],
            chunk_count=store_result["chunk_count"],
            preview=store_result["preview"],
            source_type="youtube",
            message=f"Successfully processed YouTube video ({result['segment_count']} transcript segments, {store_result['chunk_count']} chunks created).",
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.post("/process-pdf", response_model=ProcessResponse)
async def process_pdf(file: UploadFile = File(...)):
    """Process an uploaded PDF: extract text, chunk, and embed."""
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid PDF file.",
        )

    # Validate file size (max 10 MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size is 10 MB.",
        )

    try:
        # Step 1: Extract text
        pdf_result = extract_text_from_pdf(contents)
        text = pdf_result["text"]

        # Step 2: Chunk and store embeddings
        store_result = chunk_and_store(
            text=text,
            source_type="pdf",
            source_info=file.filename,
        )

        return ProcessResponse(
            content_id=store_result["content_id"],
            chunk_count=store_result["chunk_count"],
            preview=store_result["preview"],
            source_type="pdf",
            message=f"Successfully processed PDF '{file.filename}' ({pdf_result['extracted_pages']}/{pdf_result['page_count']} pages, {store_result['chunk_count']} chunks created).",
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
