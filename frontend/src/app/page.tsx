"use client";

import { useState, useCallback } from "react";
import { processVideo, processPDF, ProcessResponse } from "@/lib/api";

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleProcessVideo = async () => {
    if (!youtubeUrl.trim()) {
      setError("Please enter a YouTube URL.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await processVideo(youtubeUrl);
      setResult(res);
      localStorage.setItem("contentId", res.content_id);
      localStorage.setItem("sourceType", res.source_type);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to process video.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPDF = async (file: File) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await processPDF(file);
      setResult(res);
      localStorage.setItem("contentId", res.content_id);
      localStorage.setItem("sourceType", res.source_type);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to process PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      handleProcessPDF(file);
    } else {
      setError("Please drop a valid PDF file.");
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessPDF(file);
  };

  return (
    <div className="max-w-4xl mx-auto fade-in">
      {/* Hero */}
      <div className="text-center mb-12 pt-8">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{
            background: "rgba(108, 92, 231, 0.1)",
            border: "1px solid rgba(108, 92, 231, 0.2)",
          }}
        >
          <div className="pulse-dot" />
          <span className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
            AI-Powered Learning
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
          Learn Smarter with{" "}
          <span className="gradient-text">AI Assistance</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Paste a YouTube URL or upload a PDF — get instant flashcards, quizzes, and an AI chat tutor
          that understands your content.
        </p>
      </div>

      {/* YouTube Input */}
      <div className="glass-card p-6 mb-6 slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(239, 68, 68, 0.15)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" fill="#ef4444" />
              <polygon points="9.75,15.02 15.5,11.75 9.75,8.48" fill="white" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">YouTube Video</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Paste a video URL to extract its transcript
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="input-field flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleProcessVideo()}
            disabled={loading}
          />
          <button
            onClick={handleProcessVideo}
            disabled={loading || !youtubeUrl.trim()}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : null}
            Process
          </button>
        </div>
      </div>

      {/* PDF Upload */}
      <div className="glass-card p-6 mb-8 slide-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(108, 92, 231, 0.15)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">PDF Document</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Upload a PDF to extract its text content
            </p>
          </div>
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className="block cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all"
          style={{
            borderColor: dragActive ? "var(--accent-primary)" : "var(--border-color)",
            background: dragActive ? "rgba(108, 92, 231, 0.05)" : "transparent",
          }}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            className="hidden"
            disabled={loading}
          />
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            className="mx-auto mb-3"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <p className="font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            {loading ? "Processing..." : "Drop your PDF here or click to browse"}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Supports .pdf files up to 10 MB
          </p>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-4 rounded-xl mb-6 flex items-center gap-3 slide-up"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span style={{ color: "var(--error)" }}>{error}</span>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="glass-card p-6 slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0, 210, 160, 0.15)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: "var(--success)" }}>
                Content Processed Successfully!
              </h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {result.message}
              </p>
            </div>
          </div>

          <div
            className="p-4 rounded-xl mb-4"
            style={{ background: "var(--bg-primary)" }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Content ID
              </span>
              <span className={`tag ${result.source_type === "youtube" ? "tag-error" : "tag-success"}`}>
                {result.source_type === "youtube" ? "📹 YouTube" : "📄 PDF"}
              </span>
            </div>
            <code
              className="text-sm font-mono block"
              style={{ color: "var(--accent-primary)" }}
            >
              {result.content_id}
            </code>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a href="/flashcards" className="btn-primary text-center justify-center flex-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Generate Flashcards
            </a>
            <a href="/quiz" className="btn-primary text-center justify-center flex-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Take a Quiz
            </a>
            <a href="/chat" className="btn-secondary text-center justify-center flex-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Chat with AI
            </a>
          </div>
        </div>
      )}

      {/* Features grid */}
      {!result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {[
            {
              title: "Smart Flashcards",
              desc: "AI generates 10-15 flashcards covering key concepts from your content",
              icon: "🎴",
            },
            {
              title: "Auto Quizzes",
              desc: "Test your understanding with 5-10 auto-evaluated MCQ questions",
              icon: "📝",
            },
            {
              title: "RAG Chat",
              desc: "Chat with an AI tutor that understands your specific content",
              icon: "💬",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="glass-card p-5 slide-up"
            >
              <span className="text-2xl mb-3 block">{feature.icon}</span>
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
