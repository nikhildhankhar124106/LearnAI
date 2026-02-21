"use client";

import { useState, useEffect, useRef } from "react";
import { chatStream, ChatMessage } from "@/lib/api";
import ReactMarkdown from "react-markdown";

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [contentId, setContentId] = useState("");
    const [error, setError] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const id = localStorage.getItem("contentId") || "";
        setContentId(id);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || streaming) return;

        if (!contentId.trim()) {
            setError("No content processed. Go to Home page and process a video or PDF first.");
            return;
        }

        setError("");
        const userMessage: ChatMessage = { role: "user", content: trimmed };
        const history = [...messages, userMessage];
        setMessages(history);
        setInput("");
        setStreaming(true);

        // Add placeholder for assistant message
        const assistantMessage: ChatMessage = { role: "assistant", content: "" };
        setMessages([...history, assistantMessage]);

        chatStream(
            contentId,
            trimmed,
            messages, // Send previous history (before this message)
            (chunk) => {
                setMessages((prev) => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg.role === "assistant") {
                        updated[updated.length - 1] = {
                            ...lastMsg,
                            content: lastMsg.content + chunk,
                        };
                    }
                    return updated;
                });
            },
            () => {
                setStreaming(false);
            },
            (errMsg) => {
                setError(errMsg);
                setStreaming(false);
                // Remove empty assistant message
                setMessages((prev) => {
                    const updated = [...prev];
                    if (updated[updated.length - 1]?.content === "") {
                        updated.pop();
                    }
                    return updated;
                });
            }
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setMessages([]);
        setError("");
    };

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pt-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold">
                        <span className="gradient-text">AI Chat</span>
                    </h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                        Ask questions about your processed content
                    </p>
                </div>
                <div className="flex gap-2">
                    {messages.length > 0 && (
                        <button onClick={clearChat} className="btn-secondary text-sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Content ID */}
            {messages.length === 0 && (
                <div className="glass-card p-4 mb-4 flex-shrink-0">
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
                    className="p-3 rounded-xl mb-4 flex items-center gap-3 flex-shrink-0"
                    style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                    }}
                >
                    <span className="text-sm" style={{ color: "var(--error)" }}>{error}</span>
                </div>
            )}

            {/* Messages area */}
            <div
                className="flex-1 overflow-y-auto rounded-xl p-4 space-y-4 mb-4"
                style={{ background: "var(--bg-secondary)" }}
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                            style={{ background: "rgba(108, 92, 231, 0.15)" }}
                        >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
                        <p className="text-sm max-w-md" style={{ color: "var(--text-muted)" }}>
                            Ask any question about your processed content. The AI will use RAG to find relevant
                            context and provide accurate answers.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-6 justify-center">
                            {[
                                "Summarize the main concepts",
                                "What are the key takeaways?",
                                "Explain the most important topic",
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => {
                                        setInput(suggestion);
                                        inputRef.current?.focus();
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm transition-all"
                                    style={{
                                        background: "var(--bg-card)",
                                        border: "1px solid var(--border-color)",
                                        color: "var(--text-secondary)",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "var(--accent-primary)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "var(--border-color)";
                                    }}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} slide-up`}
                    >
                        <div
                            className={`max-w-[85%] md:max-w-[70%] p-4 ${msg.role === "user" ? "chat-message-user" : "chat-message-assistant"
                                }`}
                        >
                            {msg.role === "assistant" ? (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                                </div>
                            ) : (
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}

                {streaming && (
                    <div className="flex justify-start">
                        <div className="flex gap-1 p-3">
                            <span
                                className="w-2 h-2 rounded-full animate-bounce"
                                style={{ background: "var(--accent-primary)", animationDelay: "0ms" }}
                            />
                            <span
                                className="w-2 h-2 rounded-full animate-bounce"
                                style={{ background: "var(--accent-primary)", animationDelay: "150ms" }}
                            />
                            <span
                                className="w-2 h-2 rounded-full animate-bounce"
                                style={{ background: "var(--accent-primary)", animationDelay: "300ms" }}
                            />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div
                className="flex-shrink-0 p-3 rounded-xl flex gap-3 items-end"
                style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                }}
            >
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about your content..."
                    rows={1}
                    className="flex-1 bg-transparent outline-none resize-none text-sm"
                    style={{
                        color: "var(--text-primary)",
                        maxHeight: "120px",
                        minHeight: "24px",
                        fontFamily: "inherit",
                    }}
                    disabled={streaming}
                />
                <button
                    onClick={handleSend}
                    disabled={streaming || !input.trim()}
                    className="p-2 rounded-lg transition-all flex-shrink-0"
                    style={{
                        background: input.trim() ? "var(--accent-gradient)" : "var(--border-color)",
                        cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
