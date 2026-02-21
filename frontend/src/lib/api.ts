/**
 * API client for the AI Learning Assistant backend.
 * All endpoints hit the FastAPI backend at localhost:8000.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────

export interface ProcessResponse {
    content_id: string;
    chunk_count: number;
    preview: string;
    source_type: string;
    message: string;
}

export interface Flashcard {
    front: string;
    back: string;
}

export interface FlashcardResponse {
    content_id: string;
    flashcards: Flashcard[];
    count: number;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
}

export interface QuizResponse {
    content_id: string;
    questions: QuizQuestion[];
    count: number;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

// ── API Error ────────────────────────────────────────────────────────────

export class APIError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = "APIError";
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let detail = "An unexpected error occurred.";
        try {
            const body = await response.json();
            detail = body.detail || detail;
        } catch { }
        throw new APIError(detail, response.status);
    }
    return response.json();
}

// ── Content Processing ──────────────────────────────────────────────────

export async function processVideo(url: string): Promise<ProcessResponse> {
    const res = await fetch(`${API_BASE}/process-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
    });
    return handleResponse<ProcessResponse>(res);
}

export async function processPDF(file: File): Promise<ProcessResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/process-pdf`, {
        method: "POST",
        body: formData,
    });
    return handleResponse<ProcessResponse>(res);
}

// ── Generation ──────────────────────────────────────────────────────────

export async function generateFlashcards(
    contentId: string
): Promise<FlashcardResponse> {
    const res = await fetch(`${API_BASE}/generate-flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId }),
    });
    return handleResponse<FlashcardResponse>(res);
}

export async function generateQuiz(contentId: string): Promise<QuizResponse> {
    const res = await fetch(`${API_BASE}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId }),
    });
    return handleResponse<QuizResponse>(res);
}

// ── Chat (Streaming) ────────────────────────────────────────────────────

export async function chatStream(
    contentId: string,
    message: string,
    history: ChatMessage[],
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (error: string) => void
) {
    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content_id: contentId,
                message,
                history,
            }),
        });

        if (!res.ok) {
            let detail = "Chat request failed.";
            try {
                const body = await res.json();
                detail = body.detail || detail;
            } catch { }
            onError(detail);
            return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
            onError("No response stream available.");
            return;
        }

        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            onChunk(text);
        }

        onDone();
    } catch (err) {
        onError(err instanceof Error ? err.message : "Network error occurred.");
    }
}
