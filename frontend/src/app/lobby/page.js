"use client";

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
            const res = await fetch(`http://localhost:8080/lobby/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
                body: JSON.stringify({ code: lobbyCode }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
        console.log(lobbyCode);
        console.log(lobbies);
        router.push(`/lobby/${lobbyID}`);
    };

    return (
        <>
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

                    <div style={{
                        background: 'var(--surface-0)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r)',
                        padding: 'var(--s6)',
                    }}>
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: 11,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--text-400)',
                            display: 'block',
                            marginBottom: 'var(--s4)',
                        }}>
                            Open Games
                        </span>

                        {/* Scrollable container */}
                        <div style={{
                            maxHeight: 420,
                            overflowY: 'auto',
                            scrollbarGutter: 'stable',
                            background: 'var(--surface-1)',
                            borderRadius: 'var(--r)',
                            padding: 'var(--s3)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--s2)',
                        }}>
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
            </div>
        </>
    );
}