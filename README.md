# 🤖 AI Learning Assistant

An AI-powered Learning Assistant where users can input a YouTube URL or upload a PDF. The system processes the content and generates flashcards, quizzes, and allows contextual chat using RAG (Retrieval-Augmented Generation).

## 🏗 Architecture

```mermaid
graph TB
    subgraph Frontend ["Frontend (Next.js 15)"]
        UI[App Router Pages]
        API_CLIENT[API Client]
    end

    subgraph Backend ["Backend (FastAPI)"]
        ROUTES[API Routes]
        YT[YouTube Service]
        PDF[PDF Service]
        EMB[Embedding Service]
        AI[AI Service]
    end

    subgraph Storage ["Storage"]
        CHROMA[(ChromaDB Vector Store)]
    end

    subgraph External ["External APIs"]
        GEMINI[Google Gemini AI]
    end

    UI --> API_CLIENT
    API_CLIENT -->|HTTP/Streaming| ROUTES
    ROUTES --> YT
    ROUTES --> PDF
    ROUTES --> EMB
    ROUTES --> AI
    EMB --> CHROMA
    EMB --> GEMINI
    AI --> GEMINI
```

### Data Flow

1. **Content Ingestion** → User provides YouTube URL or uploads PDF
2. **Text Extraction** → Transcript or PDF text is extracted
3. **Chunking** → Text is split using `RecursiveCharacterTextSplitter` (1000 chars, 200 overlap)
4. **Embedding** → Chunks are embedded using `text-embedding-004` model
5. **Storage** → Embeddings stored in ChromaDB with cosine similarity index
6. **Generation** → Gemini generates flashcards/quizzes from stored chunks
7. **RAG Chat** → User queries are embedded → top-k chunks retrieved → Gemini generates contextual response via streaming

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router, TypeScript) |
| UI Styling | TailwindCSS |
| Backend | Python FastAPI |
| Vector Store | ChromaDB (persistent, cosine similarity) |
| AI Model | Google Gemini 2.0 Flash |
| Embeddings | Gemini text-embedding-004 |
| YouTube | youtube-transcript-api |
| PDF | PyPDF2 |

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/process-video` | Process YouTube video transcript |
| `POST` | `/process-pdf` | Process uploaded PDF document |
| `POST` | `/generate-flashcards` | Generate 10-15 flashcards |
| `POST` | `/generate-quiz` | Generate 5-10 MCQ questions |
| `POST` | `/chat` | RAG-based chat (streaming) |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger API documentation |

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Google Gemini API Key** (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone the Repository

```bash
git clone <repository-url>
cd QUIZ-TRACKER
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (macOS/Linux)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Environment Variables

#### Backend (`backend/.env`)
```
GEMINI_API_KEY=your_key_here        # Required
CHROMA_PERSIST_DIR=./chroma_data    # Optional
CHUNK_SIZE=1000                     # Optional
CHUNK_OVERLAP=200                   # Optional
RAG_TOP_K=5                         # Optional
FRONTEND_URL=http://localhost:3000  # Optional
```

#### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📸 Features

### 🏠 Home Page
- YouTube URL input with instant processing
- PDF drag-and-drop upload zone
- Processing status with content preview

### 🎴 Flashcards
- 3D flip card animation
- Keyboard navigation (Arrow keys, Space/Enter to flip)
- Progress bar and dot indicators

### 📝 Quiz
- 5-10 multiple-choice questions
- Visual option selection with A/B/C/D labels
- Animated score circle with percentage
- Per-question explanations after submission
- Retry functionality

### 💬 AI Chat
- RAG-based contextual responses
- Streaming response with typing indicator
- Markdown rendering for formatted answers
- Chat history maintained per session
- Suggestion chips for common queries

## 📁 Project Structure

```
QUIZ-TRACKER/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment configuration
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment template
│   ├── routes/
│   │   ├── process.py          # /process-video, /process-pdf
│   │   ├── generate.py         # /generate-flashcards, /generate-quiz
│   │   └── chat.py             # /chat (streaming)
│   └── services/
│       ├── youtube_service.py  # YouTube transcript extraction
│       ├── pdf_service.py      # PDF text extraction
│       ├── embedding_service.py# Chunking, embedding, ChromaDB
│       └── ai_service.py       # Gemini AI (flashcards, quiz, chat)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx      # Root layout with sidebar
│   │   │   ├── page.tsx        # Home page
│   │   │   ├── globals.css     # Design system
│   │   │   ├── flashcards/page.tsx
│   │   │   ├── quiz/page.tsx
│   │   │   └── chat/page.tsx
│   │   ├── components/
│   │   │   └── Sidebar.tsx     # Responsive navigation
│   │   └── lib/
│   │       └── api.ts          # Backend API client
│   └── package.json
├── .gitignore
└── README.md
```

## 🧪 Error Handling

- **YouTube**: Invalid URL detection, missing transcript fallback, rate limit handling
- **PDF**: File type validation, size limit (10 MB), empty/scanned PDF detection
- **AI Generation**: JSON parsing with fallback extraction, response validation
- **Chat**: Stream error recovery, empty context handling
- **Frontend**: Loading states, error messages, disabled states during processing

## 📄 License

MIT
