"use client";
import { apiFetch } from '@/lib/api';

import { useState, useContext } from "react";
import { UserContext } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import OpenGames from "./OpenGames";
import Navbar from "@/components/navbar";

export default function LobbyPage() {
    const { user } = useContext(UserContext);
    const [error, setError] = useState(null);
    const [lobby, setLobby] = useState(null);
    const [players, setPlayers] = useState(null);
    const [lobbies, setLobbies] = useState(null);

    const router = useRouter();

    const joinLobby = async (lobbyCode, lobbyID) => {
        setError(null);
        try {
            const res = await apiFetch(`/lobby/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: lobbyCode }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
        } catch (err) {
            // console.error(err);
            setError("Network error");
        }
        // console.log(lobbyCode);
        // console.log(lobbies);
        router.push(`/lobby/${lobbyID}`);
    };

    return (
        <div className="browse-root">
            <style>{`
                @media (max-width: 768px) {
                    html, body { overflow: hidden; }
                    .browse-root { height: 100vh; height: 100dvh; min-height: 0 !important; overflow-y: auto; overscroll-behavior: none; }
                }
            `}</style>
            <Navbar />
            <div style={{
                minHeight: 'calc(100vh - 70px)',
                background: 'var(--bg)',
                fontFamily: "'DM Sans', sans-serif",
            }}>
                <div style={{
                    maxWidth: 1080,
                    margin: '0 auto',
                    padding: 'var(--s10) var(--s6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--s8)',
                }}>

                    {/* DEBUG — remove after testing */}
                    <div style={{ background: '#1a1510', color: '#fff', fontFamily: 'monospace', fontSize: 11, padding: '8px 12px', borderRadius: 6, wordBreak: 'break-all' }}>
                        user: {user ? JSON.stringify(user) : 'null'}
                    </div>

                    {/* Page header */}
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s6)' }}>
                        <h1 style={{
                            fontFamily: "'Fraunces', serif",
                            fontWeight: 900,
                            fontSize: 36,
                            color: 'var(--text-900)',
                            letterSpacing: '-0.03em',
                            lineHeight: 1.05,
                            margin: 5,
                        }}>
                            Find a Game
                        </h1>
                    </div>

                    {/* Error bar */}
                    {error && (
                        <div style={{
                            background: '#fef2ef',
                            border: '1px solid var(--accent-light)',
                            borderLeft: '3px solid var(--state-out)',
                            borderRadius: 'var(--r)',
                            padding: 'var(--s3) var(--s4)',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            color: 'var(--state-out)',
                        }}>
                            {error}
                        </div>
                    )}

                    <OpenGames
                        user={user}
                        setError={setError}
                        lobbies={lobbies}
                        setLobbies={setLobbies}
                        joinLobby={joinLobby}
                    />

                </div>
            </div>
        </div>
    );
}