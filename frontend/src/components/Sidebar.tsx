"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
    {
        href: "/",
        label: "Home",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
    },
    {
        href: "/flashcards",
        label: "Flashcards",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
        ),
    },
    {
        href: "/quiz",
        label: "Quiz",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        ),
    },
    {
        href: "/chat",
        label: "Chat",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
                aria-label="Toggle menu"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {mobileOpen ? (
                        <path d="M18 6L6 18M6 6l12 12" />
                    ) : (
                        <path d="M3 12h18M3 6h18M3 18h18" />
                    )}
                </svg>
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                    } md:translate-x-0`}
                style={{
                    background: "var(--bg-secondary)",
                    borderRight: "1px solid var(--border-color)",
                }}
            >
                {/* Logo */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: "var(--accent-gradient)" }}
                        >
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                                LearnAI
                            </h1>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                Study Assistant
                            </p>
                        </div>
                    </div>
                </div>

                {/* Nav links */}
                <nav className="flex-1 px-3 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Bottom info */}
                <div className="p-4 mx-3 mb-4 rounded-xl" style={{ background: "var(--bg-card)" }}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="pulse-dot" />
                        <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
                            System Online
                        </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Powered by Gemini AI
                    </p>
                </div>
            </aside>
        </>
    );
}
