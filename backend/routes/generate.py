"""Routes for flashcard and quiz generation."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.embedding_service import get_all_chunks
from services.ai_service import generate_flashcards, generate_quiz

router = APIRouter()


class GenerateRequest(BaseModel):
    content_id: str
    num_items: int | None = None  # Optional: override default count


class FlashcardItem(BaseModel):
    front: str
    back: str


class FlashcardResponse(BaseModel):
    content_id: str
    flashcards: list[FlashcardItem]
    count: int


class QuizOption(BaseModel):
    text: str
    index: int


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_answer: int
    explanation: str


class QuizResponse(BaseModel):
    content_id: str
    questions: list[QuizQuestion]
    count: int


@router.post("/generate-flashcards", response_model=FlashcardResponse)
async def create_flashcards(request: GenerateRequest):
    """Generate flashcards from processed content."""
    try:
        chunks = get_all_chunks(request.content_id)
        num_cards = request.num_items if request.num_items else 12

        # Clamp to 10-15 range per spec
        num_cards = max(10, min(15, num_cards))

        flashcards = generate_flashcards(chunks, num_cards=num_cards)

        return FlashcardResponse(
            content_id=request.content_id,
            flashcards=[FlashcardItem(**card) for card in flashcards],
            count=len(flashcards),
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")


@router.post("/generate-quiz", response_model=QuizResponse)
async def create_quiz(request: GenerateRequest):
    """Generate quiz questions from processed content."""
    try:
        chunks = get_all_chunks(request.content_id)
        num_questions = request.num_items if request.num_items else 8

        # Clamp to 5-10 range per spec
        num_questions = max(5, min(10, num_questions))

        questions = generate_quiz(chunks, num_questions=num_questions)

        return QuizResponse(
            content_id=request.content_id,
            questions=[QuizQuestion(**q) for q in questions],
            count=len(questions),
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")
