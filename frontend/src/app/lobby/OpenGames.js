"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";

const TIMER_OPTIONS = [
    { value: "",       label: "Any timer" },
    { value: "none",   label: "No timer" },
    { value: "30",     label: "30s" },
    { value: "60",     label: "60s" },
    { value: "90",     label: "90s" },
    { value: "120",    label: "120s" },
    { value: "180",    label: "180s" },
];

function FilterChip({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: "var(--r)",
                border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: active ? "var(--accent-light)" : "var(--surface-0)",
                color: active ? "var(--accent-dim)" : "var(--text-600)",
                cursor: "pointer",
                transition: "all 0.15s",
            }}
        >
            {label}
        </button>
    );
}

export default function OpenGames({ user, setError, lobbies, setLobbies, joinLobby }) {
    const [search, setSearch]           = useState("");
    const [randomFilter, setRandomFilter] = useState(null);  // null | 'random' | 'select'
    const [chatFilter, setChatFilter]   = useState(null);    // null | 'chat' | 'nochat'
    const [timerFilter, setTimerFilter] = useState("");
    const [joiningId, setJoiningId] = useState(null);

    const getLobbies = async () => {
        setError(null);
        try {
            const res = await fetch(`http://localhost:8080/lobby/find`, {
                method: "GET",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            setLobbies(data);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    useEffect(() => {
        if (user?.id) getLobbies();
    }, [user?.id]);

    const filtered = (lobbies ?? []).filter(l => {
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            const matchesHost = l.user?.email?.toLowerCase().includes(q) || l.user?.username?.toLowerCase().includes(q);
            const matchesSet  = l.characterSet?.name?.toLowerCase().includes(q);
            if (!matchesHost && !matchesSet) return false;
        }
        if (randomFilter === "random" && !l.randomizeSecret) return false;
        if (randomFilter === "select" && l.randomizeSecret) return false;
        if (chatFilter === "chat" && !l.chatFeature) return false;
        if (chatFilter === "nochat" && l.chatFeature) return false;
        if (timerFilter === "none" && l.turnTimerSeconds > 0) return false;
        if (timerFilter && timerFilter !== "none" && l.turnTimerSeconds !== parseInt(timerFilter)) return false;
        return true;
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>

            {/* Search + filters */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
                <input
                    type="text"
                    placeholder="Search by host or set name…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        height: 40,
                        padding: "0 var(--s4)",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        color: "var(--text-900)",
                        background: "var(--surface-0)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--r)",
                        outline: "none",
                    }}
                    onFocus={e => e.target.style.borderColor = "var(--accent)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                />

                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)", alignItems: "center" }}>
                    {/* Random / Select */}
                    <FilterChip label="Random" active={randomFilter === "random"} onClick={() => setRandomFilter(p => p === "random" ? null : "random")} />
                    <FilterChip label="Select" active={randomFilter === "select"} onClick={() => setRandomFilter(p => p === "select" ? null : "select")} />

                    <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 var(--s1)" }} />

                    {/* Chat / No chat */}
                    <FilterChip label="Chat"    active={chatFilter === "chat"}   onClick={() => setChatFilter(p => p === "chat"   ? null : "chat")} />
                    <FilterChip label="No chat" active={chatFilter === "nochat"} onClick={() => setChatFilter(p => p === "nochat" ? null : "nochat")} />

                    <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 var(--s1)" }} />

                    {/* Timer dropdown */}
                    <select
                        value={timerFilter}
                        onChange={e => setTimerFilter(e.target.value)}
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: "var(--r)",
                            border: "1px solid var(--border)",
                            background: "var(--surface-0)",
                            color: "var(--text-600)",
                            cursor: "pointer",
                            outline: "none",
                        }}
                    >
                        {TIMER_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Lobby list */}
            {filtered.length > 0 ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
                    {filtered.map((l) => (
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
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s1)", minWidth: 0 }}>
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-900)" }}>
                                    {l.characterSet?.name ?? "Classic"}
                                </span>
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-400)" }}>
                                    hosted by {l.user?.username ?? l.user?.email}
                                </span>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)", alignItems: "center" }}>
                                {[
                                    { label: l.randomizeSecret ? "Random" : "Select" },
                                    { label: `${l.lobbyCharacters?.length ?? "?"} chars` },
                                    l.turnTimerSeconds > 0 && { label: `${l.turnTimerSeconds}s timer` },
                                    { label: l.chatFeature ? "Chat" : "No chat" },
                                ].filter(Boolean).map((badge, i) => (
                                    <span key={i} style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 12,
                                        fontWeight: 500,
                                        color: "var(--text-600)",
                                        background: "var(--surface-1)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "var(--r)",
                                        padding: "2px 8px",
                                        whiteSpace: "nowrap",
                                    }}>
                                        {badge.label}
                                    </span>
                                ))}
                            </div>

                            <button
                                onClick={async () => {
                                    setJoiningId(l.id);
                                    await joinLobby(l.code, l.id);
                                    setJoiningId(null);
                                }}
                                disabled={joiningId !== null}
                                style={{
                                    flexShrink: 0,
                                    height: 32,
                                    padding: "0 var(--s4)",
                                    background: "var(--accent)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "var(--r)",
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: "var(--text-base)",
                                    fontWeight: 600,
                                    cursor: joiningId !== null ? "not-allowed" : "pointer",
                                    transition: "background 150ms",
                                    opacity: joiningId !== null && joiningId !== l.id ? 0.5 : 1,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                                onMouseEnter={e => { if (!joiningId) e.currentTarget.style.background = "var(--accent-dim)"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
                            >
                                {joiningId === l.id && <Loader2 size={13} style={{ animation: "gw-spin 1s linear infinite" }} />}
                                {joiningId === l.id ? "Joining…" : "Join"}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-400)", margin: 0, padding: "var(--s4) 0" }}>
                    {(lobbies ?? []).length === 0 ? "No open games right now." : "No games match your filters."}
                </p>
            )}
        </div>
    );
}
