"use client";

import { useState, useEffect, useCallback } from "react";
import { generateFlashcards, Flashcard } from "@/lib/api";

export default function FlashcardsPage() {
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [contentId, setContentId] = useState("");

    useEffect(() => {
        const id = localStorage.getItem("contentId") || "";
        setContentId(id);
    }, []);

    const handleGenerate = async () => {
        if (!contentId.trim()) {
            setError("No content processed yet. Please go to the Home page and process a video or PDF first.");
            return;
        }
        setLoading(true);
        setError("");
        setFlashcards([]);
        setCurrentIndex(0);
        setFlipped(false);
        try {
            const res = await generateFlashcards(contentId);
            setFlashcards(res.flashcards);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to generate flashcards.");
        } finally {
            setLoading(false);
        }
    };

    const goNext = useCallback(() => {
        setFlipped(false);
        setTimeout(() => setCurrentIndex((i) => Math.min(i + 1, flashcards.length - 1)), 150);
    }, [flashcards.length]);

    const goPrev = useCallback(() => {
        setFlipped(false);
        setTimeout(() => setCurrentIndex((i) => Math.max(i - 1, 0)), 150);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === "n") goNext();
            else if (e.key === "ArrowLeft" || e.key === "p") goPrev();
            else if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setFlipped((f) => !f);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [goNext, goPrev]);

    const card = flashcards[currentIndex];

    return (
        <div className="max-w-3xl mx-auto fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pt-4">
                <div>
                    <h1 className="text-3xl font-bold">
                        <span className="gradient-text">Flashcards</span>
                    </h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                        Click a card to flip it · Use arrow keys to navigate
                    </p>
                </div>
                <button onClick={handleGenerate} disabled={loading} className="btn-primary">
                    {loading ? (
                        <>
                            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            {flashcards.length > 0 ? "Regenerate" : "Generate"}
                        </>
                    )}
                </button>
            </div>

            {/* Content ID input */}
            {flashcards.length === 0 && !loading && (
                <div className="glass-card p-6 mb-6">
                    <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>
                        Content ID
                    </label>
                    <input
                        type="text"
                        value={contentId}
                        onChange={(e) => setContentId(e.target.value)}
                        placeholder="Enter content ID from processing step"
                        className="input-field"
                    />
                </div>
            )}

            {/* Error */}
            {error && (
                <div
                    className="p-4 rounded-xl mb-6 flex items-center gap-3"
                    style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span style={{ color: "var(--error)" }}>{error}</span>
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="text-center py-20">
                    <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
                    <p style={{ color: "var(--text-secondary)" }}>Generating flashcards from your content...</p>
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                        This may take 10-15 seconds
                    </p>
                </div>
            )}

            {/* Flashcard display */}
            {card && (
                <div className="slide-up">
                    {/* Progress */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
                            <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                    width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
                                    background: "var(--accent-gradient)",
                                }}
                            />
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                            {currentIndex + 1} / {flashcards.length}
                        </span>
                    </div>

                    {/* Flip card */}
                    <div className="flashcard-container cursor-pointer mb-6" onClick={() => setFlipped(!flipped)}>
                        <div className={`flashcard-inner ${flipped ? "flipped" : ""}`}>
                            {/* Front */}
                            <div
                                className="flashcard-face glass-card"
                                style={{ background: "var(--bg-card)" }}
                            >
                                <div className="text-center">
                                    <span
                                        className="tag tag-warning mb-4 inline-block"
                                    >
                                        Question
                                    </span>
                                    <p className="text-xl font-medium leading-relaxed">{card.front}</p>
                                </div>
                            </div>
                            {/* Back */}
                            <div
                                className="flashcard-face flashcard-back"
                                style={{
                                    background: "linear-gradient(135deg, rgba(108, 92, 231, 0.2), rgba(168, 85, 247, 0.2))",
                                    border: "1px solid rgba(108, 92, 231, 0.3)",
                                }}
                            >
                                <div className="text-center">
                                    <span className="tag tag-success mb-4 inline-block">Answer</span>
                                    <p className="text-lg leading-relaxed" style={{ color: "var(--text-primary)" }}>
                                        {card.back}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={goPrev}
                            disabled={currentIndex === 0}
                            className="btn-secondary"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Previous
                        </button>

                        <div className="flex gap-1">
                            {flashcards.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setFlipped(false);
                                        setCurrentIndex(i);
                                    }}
                                    className="w-2.5 h-2.5 rounded-full transition-all"
                                    style={{
                                        background: i === currentIndex ? "var(--accent-primary)" : "var(--border-color)",
                                        transform: i === currentIndex ? "scale(1.3)" : "scale(1)",
                                    }}
                                />
                            ))}
                        </div>

                        <button
                            onClick={goNext}
                            disabled={currentIndex === flashcards.length - 1}
                            className="btn-secondary"
                        >
                            Next
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
