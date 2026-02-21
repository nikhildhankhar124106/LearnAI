"""Routes for RAG-based chat with streaming responses."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.embedding_service import retrieve_relevant_chunks
from services.ai_service import chat_stream

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    content_id: str
    message: str
    history: list[ChatMessage] = []


@router.post("/chat")
async def chat(request: ChatRequest):
    """RAG-based chat with streaming response.

    Retrieves relevant content chunks, then streams AI response.
    """
    try:
        # Step 1: Retrieve relevant chunks via RAG
        relevant_chunks = retrieve_relevant_chunks(
            content_id=request.content_id,
            query=request.message,
        )

        if not relevant_chunks:
            raise HTTPException(
                status_code=404,
                detail="No relevant content found. Please process some content first.",
            )

        # Step 2: Stream AI response
        history_dicts = [msg.model_dump() for msg in request.history]

        async def response_generator():
            async for chunk in chat_stream(
                query=request.message,
                context_chunks=relevant_chunks,
                chat_history=history_dicts,
            ):
                yield chunk

        return StreamingResponse(
            response_generator(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "X-Content-Type-Options": "nosniff",
            },
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")
