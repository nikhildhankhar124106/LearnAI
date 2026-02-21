"use client";

import { useState, useEffect } from "react";
import { generateQuiz, QuizQuestion } from "@/lib/api";

export default function QuizPage() {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [contentId, setContentId] = useState("");

    useEffect(() => {
        const id = localStorage.getItem("contentId") || "";
        setContentId(id);
    }, []);

    const handleGenerate = async () => {
        if (!contentId.trim()) {
            setError("No content processed yet. Please go to Home and process a video or PDF first.");
            return;
        }
        setLoading(true);
        setError("");
        setQuestions([]);
        setSelectedAnswers([]);
        setSubmitted(false);
        try {
            const res = await generateQuiz(contentId);
            setQuestions(res.questions);
            setSelectedAnswers(new Array(res.questions.length).fill(null));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to generate quiz.");
        } finally {
            setLoading(false);
        }
    };

    const selectAnswer = (questionIdx: number, optionIdx: number) => {
        if (submitted) return;
        const updated = [...selectedAnswers];
        updated[questionIdx] = optionIdx;
        setSelectedAnswers(updated);
    };

    const handleSubmit = () => {
        if (selectedAnswers.some((a) => a === null)) {
            setError("Please answer all questions before submitting.");
            return;
        }
        setError("");
        setSubmitted(true);
    };

    const handleRetry = () => {
        setSelectedAnswers(new Array(questions.length).fill(null));
        setSubmitted(false);
    };

    const score = submitted
        ? selectedAnswers.reduce(
            (acc: number, ans: number | null, i: number) =>
                acc + (ans !== null && ans === questions[i]?.correct_answer ? 1 : 0),
            0
        )
        : 0;

    const scorePercentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    return (
        <div className="max-w-3xl mx-auto fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pt-4">
                <div>
                    <h1 className="text-3xl font-bold">
                        <span className="gradient-text">Quiz</span>
                    </h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                        Test your understanding of the material
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
                            {questions.length > 0 ? "New Quiz" : "Generate Quiz"}
                        </>
                    )}
                </button>
            </div>

            {/* Content ID input */}
            {questions.length === 0 && !loading && (
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

            {/* Loading */}
            {loading && (
                <div className="text-center py-20">
                    <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
                    <p style={{ color: "var(--text-secondary)" }}>Creating quiz questions from your content...</p>
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                        This may take 10-15 seconds
                    </p>
                </div>
            )}

            {/* Score Card (after submit) */}
            {submitted && (
                <div className="glass-card p-6 mb-8 slide-up">
                    <div className="flex items-center gap-6">
                        {/* Score circle */}
                        <div className="relative w-24 h-24 flex-shrink-0">
                            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-color)" strokeWidth="8" />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    fill="none"
                                    stroke={scorePercentage >= 70 ? "var(--success)" : scorePercentage >= 40 ? "var(--warning)" : "var(--error)"}
                                    strokeWidth="8"
                                    strokeDasharray={`${(scorePercentage / 100) * 264} 264`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                                {scorePercentage}%
                            </span>
                        </div>

                        <div className="flex-1">
                            <h3 className="text-xl font-bold mb-1">
                                {scorePercentage >= 80
                                    ? "🎉 Excellent!"
                                    : scorePercentage >= 60
                                        ? "👍 Good job!"
                                        : scorePercentage >= 40
                                            ? "📚 Keep studying!"
                                            : "💪 Try again!"}
                            </h3>
                            <p style={{ color: "var(--text-secondary)" }}>
                                You got <strong>{score}</strong> out of <strong>{questions.length}</strong> questions correct.
                            </p>
                            <button onClick={handleRetry} className="btn-secondary mt-3">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                                Retry Quiz
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Questions */}
            {questions.map((q, qi) => (
                <div
                    key={qi}
                    className="glass-card p-6 mb-4 slide-up"
                    style={{ animationDelay: `${qi * 0.05}s` }}
                >
                    <div className="flex items-start gap-3 mb-4">
                        <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{
                                background: submitted
                                    ? selectedAnswers[qi] === q.correct_answer
                                        ? "rgba(0, 210, 160, 0.2)"
                                        : "rgba(239, 68, 68, 0.2)"
                                    : "rgba(108, 92, 231, 0.15)",
                                color: submitted
                                    ? selectedAnswers[qi] === q.correct_answer
                                        ? "var(--success)"
                                        : "var(--error)"
                                    : "var(--accent-primary)",
                            }}
                        >
                            {qi + 1}
                        </span>
                        <h3 className="text-base font-medium leading-relaxed">{q.question}</h3>
                    </div>

                    <div className="space-y-2 ml-11">
                        {q.options.map((opt, oi) => {
                            const isSelected = selectedAnswers[qi] === oi;
                            const isCorrect = q.correct_answer === oi;
                            let borderColor = "var(--border-color)";
                            let bgColor = "transparent";

                            if (submitted) {
                                if (isCorrect) {
                                    borderColor = "var(--success)";
                                    bgColor = "rgba(0, 210, 160, 0.08)";
                                } else if (isSelected && !isCorrect) {
                                    borderColor = "var(--error)";
                                    bgColor = "rgba(239, 68, 68, 0.08)";
                                }
                            } else if (isSelected) {
                                borderColor = "var(--accent-primary)";
                                bgColor = "rgba(108, 92, 231, 0.08)";
                            }

                            return (
                                <button
                                    key={oi}
                                    onClick={() => selectAnswer(qi, oi)}
                                    disabled={submitted}
                                    className="w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all"
                                    style={{
                                        border: `1px solid ${borderColor}`,
                                        background: bgColor,
                                        cursor: submitted ? "default" : "pointer",
                                    }}
                                >
                                    <span
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                        style={{
                                            border: `2px solid ${borderColor}`,
                                            background: isSelected ? borderColor : "transparent",
                                            color: isSelected ? "white" : "var(--text-secondary)",
                                        }}
                                    >
                                        {String.fromCharCode(65 + oi)}
                                    </span>
                                    <span className="text-sm">{opt}</span>
                                    {submitted && isCorrect && (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" className="ml-auto">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                    {submitted && isSelected && !isCorrect && (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2.5" className="ml-auto">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Explanation after submit */}
                    {submitted && q.explanation && (
                        <div
                            className="mt-3 ml-11 p-3 rounded-xl text-sm"
                            style={{
                                background: "rgba(108, 92, 231, 0.08)",
                                border: "1px solid rgba(108, 92, 231, 0.15)",
                                color: "var(--text-secondary)",
                            }}
                        >
                            <strong style={{ color: "var(--accent-primary)" }}>Explanation:</strong> {q.explanation}
                        </div>
                    )}
                </div>
            ))}

            {/* Submit button */}
            {questions.length > 0 && !submitted && (
                <div className="flex justify-center mt-6 mb-8">
                    <button onClick={handleSubmit} className="btn-primary text-lg px-10 py-3">
                        Submit Quiz
                    </button>
                </div>
            )}
        </div>
    );
}
