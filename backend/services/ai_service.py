"""AI service for flashcard generation, quiz generation, and RAG chat using Groq."""

import json
import time
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL

# ── Groq client ───────────────────────────────────────────────────────────
_client = Groq(api_key=GROQ_API_KEY)


def _call_with_retry(messages: list[dict], max_retries: int = 3, **kwargs) -> str:
    """Call Groq with automatic retry on rate limit errors."""
    for attempt in range(max_retries + 1):
        try:
            response = _client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.7,
                max_completion_tokens=4096,
                **kwargs,
            )
            return response.choices[0].message.content
        except Exception as e:
            error_str = str(e)
            if ("429" in error_str or "rate" in error_str.lower()) and attempt < max_retries:
                wait_time = (2 ** attempt) * 5
                time.sleep(wait_time)
                continue
            raise
    raise RuntimeError("Max retries exceeded for Groq API call.")


def _parse_json_response(text: str) -> list:
    """Parse JSON array from AI response, handling markdown code blocks."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("[")
        end = text.rfind("]") + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
        raise ValueError("AI did not return valid JSON.")


def generate_flashcards(chunks: list[str], num_cards: int = 12) -> list[dict]:
    """Generate flashcards from content chunks."""
    context = "\n\n---\n\n".join(chunks[:15])

    messages = [
        {
            "role": "system",
            "content": "You are an expert educator creating study flashcards. Always return ONLY valid JSON arrays with no extra text."
        },
        {
            "role": "user",
            "content": f"""Based on the following content, generate exactly {num_cards} high-quality flashcards.

Rules:
- Cover the most important concepts, definitions, and facts
- Questions should be specific and test understanding
- Answers should be concise but complete (2-4 sentences max)
- Vary question types: definitions, explanations, comparisons, applications
- Do NOT include card numbers

Return ONLY a valid JSON array:
[
  {{"front": "What is ...?", "back": "The answer is ..."}},
  {{"front": "Explain ...", "back": "This refers to ..."}}
]

Content:
{context}"""
        }
    ]

    text = _call_with_retry(messages)
    flashcards = _parse_json_response(text)

    validated = []
    for card in flashcards:
        if isinstance(card, dict) and "front" in card and "back" in card:
            validated.append({
                "front": str(card["front"]),
                "back": str(card["back"]),
            })

    if not validated:
        raise ValueError("No valid flashcards were generated.")

    return validated


def generate_quiz(chunks: list[str], num_questions: int = 8) -> list[dict]:
    """Generate multiple-choice quiz questions from content chunks."""
    context = "\n\n---\n\n".join(chunks[:15])

    messages = [
        {
            "role": "system",
            "content": "You are an expert educator creating quizzes. Always return ONLY valid JSON arrays with no extra text."
        },
        {
            "role": "user",
            "content": f"""Based on the following content, generate exactly {num_questions} multiple-choice questions.

Rules:
- Test comprehension with exactly 4 options each
- Mix of difficulty levels
- Plausible distractors
- Brief explanation for the correct answer

Return ONLY a valid JSON array:
[
  {{
    "question": "What is ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "explanation": "The correct answer is A because ..."
  }}
]

Note: correct_answer is the 0-based index.

Content:
{context}"""
        }
    ]

    text = _call_with_retry(messages)
    questions = _parse_json_response(text)

    validated = []
    for q in questions:
        if (
            isinstance(q, dict)
            and "question" in q
            and "options" in q
            and "correct_answer" in q
            and isinstance(q["options"], list)
            and len(q["options"]) == 4
        ):
            validated.append({
                "question": str(q["question"]),
                "options": [str(opt) for opt in q["options"]],
                "correct_answer": int(q["correct_answer"]),
                "explanation": str(q.get("explanation", "")),
            })

    if not validated:
        raise ValueError("No valid quiz questions were generated.")

    return validated


async def chat_stream(
    query: str,
    context_chunks: list[str],
    chat_history: list[dict] = None,
):
    """Stream a RAG-based chat response using Groq."""
    if chat_history is None:
        chat_history = []

    context = "\n\n---\n\n".join(context_chunks)

    messages = [
        {
            "role": "system",
            "content": f"""You are a helpful AI learning assistant. Answer the user's question 
based on the provided context from their study material. Be accurate, educational, and helpful.

If the context doesn't contain enough information, say so honestly.
Use markdown formatting for readability (headers, bold, lists, code blocks).

Context from study material:
{context}"""
        }
    ]

    # Add conversation history
    for msg in (chat_history or [])[-10:]:
        messages.append({
            "role": msg["role"],
            "content": msg["content"],
        })

    # Add current query
    messages.append({"role": "user", "content": query})

    # Stream response
    for attempt in range(4):
        try:
            stream = _client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.7,
                max_completion_tokens=2048,
                stream=True,
            )

            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
            return
        except Exception as e:
            if "429" in str(e) and attempt < 3:
                import asyncio
                await asyncio.sleep((2 ** attempt) * 5)
                continue
            raise
