"use client";
import { API_URL } from '@/lib/api';

import { useState, useContext } from "react";
import { UserContext } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import LobbyForm from "./LobbyForm";

export default function LobbyPage() {
    const { user } = useContext(UserContext);
    const [error, setError] = useState(null);
    const [lobby, setLobby] = useState(null);
    const [players, setPlayers] = useState(null);
    const [lobbies, setLobbies] = useState(null);
    const [conflictLobbyId, setConflictLobbyId] = useState(null);

    const router = useRouter();

    console.log("lobby user", user)

    const getPlayers = async () => {
        setError(null);

        try {
            const res = await fetch(`${API_URL}/player/`, {
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
            console.log("Fetched players:", data);
            setPlayers(data);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    const joinLobby = async (lobbyCode, lobbyID) => {
        setError(null);

        try {
            const res = await fetch(`${API_URL}/lobby/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID": user?.id,
                },
                body: JSON.stringify({ code: lobbyCode }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
        console.log(lobbyCode)
        console.log(lobbies)
        router.push(`/lobby/${lobbyID}`);

    };

    const forfeitAndCreate = async () => {
        try {
            await fetch(`${API_URL}/lobby/forfeit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID": user?.id,
                },
                body: JSON.stringify({ lobbyId: conflictLobbyId }),
            });
            setConflictLobbyId(null);
        } catch (err) {
            console.error("Forfeit error:", err);
            setError("Network error");
        }
    };

    function ConflictModal({ lobbyId, onRejoin, onForfeit, onClose }) {
        return (
            <>
                <style>{`
                .conflict-overlay {
                    position: fixed; inset: 0; z-index: 100;
                    background: rgba(26, 21, 16, 0.5);
                    display: flex; align-items: center; justify-content: center;
                    animation: fadeIn 150ms ease-out;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .conflict-modal {
                    background: var(--surface-0);
                    border: 1px solid var(--border);
                    border-radius: var(--r);
                    padding: 32px;
                    width: 100%;
                    max-width: 400px;
                    margin: 16px;
                    animation: slideUp 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
                .conflict-modal__icon {
                    width: 48px; height: 48px;
                    background: #FEF7ED;
                    border: 1px solid #F5D28A;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 20px;
                    color: #C98C1A;
                }
                .conflict-modal__title {
                    font-family: 'Fraunces', serif;
                    font-size: 20px; font-weight: 700;
                    color: var(--text-900);
                    letter-spacing: -0.02em;
                    text-align: center;
                    margin-bottom: 8px;
                }
                .conflict-modal__sub {
                    font-size: 14px; color: var(--text-600);
                    text-align: center; line-height: 1.6;
                    margin-bottom: 24px;
                }
                .conflict-modal__actions {
                    display: flex; flex-direction: column; gap: 10px;
                }
                .conflict-modal__btn {
                    display: flex; align-items: center; justify-content: center;
                    gap: 8px; height: 44px; border-radius: 6px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 15px; font-weight: 600;
                    cursor: pointer; border: none; width: 100%;
                    transition: background 150ms ease-out, opacity 150ms;
                }
                .conflict-modal__btn--rejoin {
                    background: var(--accent); color: #fff;
                }
                .conflict-modal__btn--rejoin:hover { background: var(--accent-dim); }
                .conflict-modal__btn--forfeit {
                    background: var(--surface-1);
                    color: var(--state-out);
                    border: 1px solid var(--border);
                }
                .conflict-modal__btn--forfeit:hover { background: var(--surface-2); }
                .conflict-modal__cancel {
                    background: none; border: none;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 13px; color: var(--text-400);
                    cursor: pointer; text-align: center;
                    margin-top: 4px; padding: 4px;
                    transition: color 150ms;
                }
                .conflict-modal__cancel:hover { color: var(--text-600); }
            `}</style>
                <div className="conflict-overlay" onClick={onClose}>
                    <div className="conflict-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="conflict-modal__icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <div className="conflict-modal__title">You&apos;re already in a game</div>
                        <div className="conflict-modal__sub">
                            You have an active game in progress. Would you like to rejoin it, or forfeit and start a new one?
                        </div>
                        <div className="conflict-modal__actions">
                            <button className="conflict-modal__btn conflict-modal__btn--rejoin" onClick={onRejoin}>
                                Rejoin Game
                            </button>
                            <button className="conflict-modal__btn conflict-modal__btn--forfeit" onClick={onForfeit}>
                                Forfeit & Start New
                            </button>
                            <button className="conflict-modal__cancel" onClick={onClose}>Cancel</button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="h-screen w-full overflow-hidden">
            {conflictLobbyId && (
                <ConflictModal
                    lobbyId={conflictLobbyId}
                    onRejoin={() => router.push(`/lobby/${conflictLobbyId}`)}
                    onForfeit={forfeitAndCreate}
                    onClose={() => setConflictLobbyId(null)}
                />
            )}
            <LobbyForm
                user={user}
                setError={setError}
                setLobby={setLobby}
                getPlayers={getPlayers}
                onConflict={(lobbyId) => setConflictLobbyId(lobbyId)}
            />
        </div>
    );
}
