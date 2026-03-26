"use client";

import { useEffect } from "react";

export default function Players({ user, setError, lobbies, setLobbies, joinLobby }) {

    const getLobbies = async () => {
        setError(null);
        try {
            const res = await fetch(`http://localhost:8080/lobby/find`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID": user?.id,
                },
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }
            console.log(data)
            setLobbies(data);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    useEffect(() => {
        if (user?.id) getLobbies();
    }, [user?.id]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
            <h2 style={{
                fontFamily: "Fraunces, serif",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--text-900)",
                letterSpacing: "-0.02em",
                margin: 0,
            }}>
                Open Games
            </h2>

            {lobbies && lobbies.length > 0 ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
                    {lobbies.map((l) => (
                        <li key={l.id} style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "var(--s3) var(--s4)",
                            background: "var(--surface-0)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--r)",
                            transition: "border-color 150ms, background 150ms",
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = "var(--surface-1)";
                                e.currentTarget.style.borderColor = "var(--border-strong)";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = "var(--surface-0)";
                                e.currentTarget.style.borderColor = "var(--border)";
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s1)" }}>
                                <span style={{
                                    fontFamily: "DM Sans, sans-serif",
                                    fontSize: "var(--text-lg)",
                                    fontWeight: 600,
                                    color: "var(--text-900)",
                                }}>
                                    {l.characterSet?.name ?? "Classic"}
                                </span>
                                <span style={{
                                    fontFamily: "DM Sans, sans-serif",
                                    fontSize: "var(--text-sm)",
                                    fontWeight: 500,
                                    color: "var(--text-400)",
                                }}>
                                    hosted by {l.user?.email}
                                </span>
                            </div>

                            {/* Middle info */}
                            <div style={{ display: "flex", gap: "var(--s5)", color: "var(--text-400)", fontFamily: "DM Sans, sans-serif", fontSize: "13px" }}>
                                <span> {l.characterSet?.characters?.length ?? "?"} characters</span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
                                <button
                                    onClick={() => joinLobby(l.code, l.id)}
                                    style={{
                                        height: "32px",
                                        padding: "0 var(--s4)",
                                        background: "var(--accent)",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "var(--r)",
                                        fontFamily: "DM Sans, sans-serif",
                                        fontSize: "var(--text-base)",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "background 150ms",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = "var(--accent-dim)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
                                >
                                    Join
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: "var(--text-base)",
                    color: "var(--text-400)",
                    margin: 0,
                    padding: "var(--s4) 0",
                }}>
                    No open games right now.
                </p>
            )}
        </div>
    );
}