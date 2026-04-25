"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({ error, reset }) {
    const router = useRouter();

    useEffect(() => {
        console.error(error);
    }, [error]);

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
            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 28, color: "var(--text-900)", margin: 0 }}>
                Something went wrong
            </h1>
            <p style={{ color: "var(--text-600)", fontSize: 15, margin: 0, textAlign: "center" }}>
                An unexpected error occurred. Try again or go back home.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                    onClick={reset}
                    style={{
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
                    Try again
                </button>
                <button
                    onClick={() => router.push("/")}
                    style={{
                        padding: "10px 24px",
                        background: "transparent",
                        color: "var(--text-900)",
                        border: "1px solid var(--border)",
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
        </div>
    );
}
