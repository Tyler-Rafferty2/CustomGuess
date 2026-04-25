"use client";
import { useRouter } from "next/navigation";

export default function NotFound() {
    const router = useRouter();
    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg)",
            fontFamily: "'DM Sans', sans-serif",
            gap: 16,
            padding: 24,
        }}>
            <span style={{ fontSize: 48, lineHeight: 1 }}>404</span>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 28, color: "var(--text-900)", margin: 0 }}>
                Page not found
            </h1>
            <p style={{ color: "var(--text-600)", fontSize: 15, margin: 0, textAlign: "center" }}>
                This page doesn&apos;t exist or may have been removed.
            </p>
            <button
                onClick={() => router.push("/")}
                style={{
                    marginTop: 8,
                    padding: "10px 24px",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--r)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                }}
            >
                Back to home
            </button>
        </div>
    );
}
