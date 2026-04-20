"use client";
import { apiFetch } from '@/lib/api';

import { useEffect, useState } from "react";
import { imgUrl } from "@/lib/imgUrl";
import { useParams } from "next/navigation";
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { Loader2 } from "lucide-react";

const IMAGE_SIZE = '140px';

const Item = styled(Paper)(({ theme, isSelected, isPendingGuess }) => ({
    ...theme.typography.body2,
    padding: theme.spacing(0.5),
    textAlign: 'center',
    backgroundColor: 'var(--surface-0)',
    color: 'var(--text-900)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    position: 'relative',
    height: 'auto',
    display: 'flex',
    flexDirection: 'column',
    border: isPendingGuess
        ? '2px solid var(--accent)'
        : '2px solid var(--border)',
    borderRadius: 'var(--r)',
    boxShadow: isPendingGuess ? '0 0 0 3px var(--accent-light)' : 'none',

    '&:hover': {
        backgroundColor: 'var(--surface-1)',
        borderColor: isPendingGuess ? 'var(--accent)' : 'var(--border-strong)',
        boxShadow: isPendingGuess ? '0 0 0 3px var(--accent-light)' : '0 2px 8px rgba(0,0,0,0.10)',
    },

    '& img': {
        width: '100%',
        height: IMAGE_SIZE,
        objectFit: 'cover',
        borderRadius: 'calc(var(--r) - 2px)',
        flexShrink: 0,
        imageRendering: 'auto',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
    },

    '& .character-name': {
        marginTop: theme.spacing(1),
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif",
        lineHeight: '1.25rem',
        padding: '0 4px 4px 4px',
        height: '2.5rem',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        textAlign: 'center',
        color: 'var(--text-900)',
    },

    ...(isSelected && {
        borderColor: 'var(--border)',
        '&::after': {
            content: '""',
            position: 'absolute',
            top: theme.spacing(0.5),
            left: theme.spacing(0.5),
            right: theme.spacing(0.5),
            height: IMAGE_SIZE,
            backgroundColor: 'rgba(26, 21, 16, 0.9)',
            pointerEvents: 'none',
            borderRadius: 'calc(var(--r) - 2px)',
        }
    }),
}));

function GuessModal({ char, onConfirm, onCancel, isConfirming }) {
    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(247, 243, 238, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                animation: 'gw-fade-in 0.2s ease-out',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--surface-0)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r)',
                    width: '100%',
                    maxWidth: 360,
                    margin: '0 var(--s4)',
                    animation: 'gw-slide-up 0.25s ease-out',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: 'var(--s4) var(--s5)',
                    borderBottom: '1px solid var(--border)',
                }}>
                    <p style={{
                        fontFamily: "'Fraunces', serif",
                        fontSize: 18,
                        fontWeight: 600,
                        color: 'var(--text-900)',
                        margin: 0,
                    }}>
                        Final guess
                    </p>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: 'var(--text-400)',
                        margin: '4px 0 0 0',
                    }}>
                        A wrong guess means you lose instantly.
                    </p>
                </div>

                {/* Body */}
                <div style={{
                    padding: 'var(--s5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--s4)',
                }}>
                    <img
                        src={imgUrl(char.image)}
                        alt={char.name}
                        style={{
                            width: 72,
                            height: 72,
                            objectFit: 'cover',
                            borderRadius: 'var(--r)',
                            border: '1px solid var(--border)',
                            flexShrink: 0,
                        }}
                    />
                    <div>
                        <p style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text-400)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            margin: '0 0 4px 0',
                        }}>
                            Your guess
                        </p>
                        <p style={{
                            fontFamily: "'Fraunces', serif",
                            fontSize: 22,
                            fontWeight: 700,
                            color: 'var(--text-900)',
                            margin: 0,
                        }}>
                            {char.name}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: 'var(--s3) var(--s5) var(--s4)',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 'var(--s2)',
                }}>
                    <button
                        onClick={onCancel}
                        disabled={isConfirming}
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: 13,
                            padding: '8px 16px',
                            background: 'transparent',
                            color: 'var(--text-600)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--r)',
                            cursor: isConfirming ? 'not-allowed' : 'pointer',
                            opacity: isConfirming ? 0.5 : 1,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isConfirming}
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: 13,
                            padding: '8px 16px',
                            background: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--r)',
                            cursor: isConfirming ? 'not-allowed' : 'pointer',
                            opacity: isConfirming ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        {isConfirming && <Loader2 size={13} style={{ animation: 'gw-spin 1s linear infinite' }} />}
                        {isConfirming ? 'Confirming…' : 'Confirm guess'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes gw-fade-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes gw-slide-up {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default function Players({ user, setError, lobby, setLobby, gameState, setGameState, isGuessMode, setIsGuessMode, getGameState }) {
    const params = useParams();
    const lobbyID = params.lobbyId;
    const [selectedCharacters, setSelectedCharacters] = useState(new Set());
    const [pendingGuessId, setPendingGuessId] = useState(null);
    const [isGuessing, setIsGuessing] = useState(false);

    // Clear pending guess when leaving guess mode
    useEffect(() => {
        if (!isGuessMode) setPendingGuessId(null);
    }, [isGuessMode]);

    // Seed eliminated characters from server on load / refresh
    useEffect(() => {
        const ids = gameState?.eliminatedCharacters;
        if (Array.isArray(ids)) {
            setSelectedCharacters(new Set(ids));
        }
    }, [gameState?.eliminatedCharacters?.join?.(",")]);

    const toggleCharacter = async (charId) => {
        setSelectedCharacters(prev => {
            const next = new Set(prev);
            if (next.has(charId)) next.delete(charId);
            else next.add(charId);
            return next;
        });

        try {
            await apiFetch(`/lobby/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lobbyId: lobbyID, characterId: charId }),
            });
        } catch {
            // Persisting failed — state will re-sync on next getGameState call
        }
    };

    const makeGuess = async (charId) => {
        setIsGuessing(true);
        setError(null);
        try {
            const res = await apiFetch(`/lobby/guess`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ lobbyId: lobbyID, characterId: charId }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Something went wrong");
                setPendingGuessId(null);
                setIsGuessing(false);
                return;
            }
            await getGameState();
            setPendingGuessId(null);
        } catch (err) {
            // console.error(err);
            setError("Network error");
            setPendingGuessId(null);
        } finally {
            setIsGuessing(false);
        }
    };

    useEffect(() => {
        if (user?.id) getGameState();
    }, [user?.id]);

    if (!gameState || !gameState.lobby || !gameState.lobby.characterSet) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
                <Loader2 size={20} color="var(--text-400)" style={{ animation: 'gw-spin 1s linear infinite' }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-400)' }}>
                    Loading game data…
                </span>
            </div>
        );
    }

    const characters = gameState.lobby.lobbyCharacters || [];
    const pendingChar = characters.find(c => c.id === pendingGuessId);

    return (
        <div style={{
            background: isGuessMode ? 'var(--accent-light)' : 'transparent',
            border: '2px solid transparent',
            borderColor: isGuessMode ? 'var(--accent)' : 'transparent',
            borderRadius: 'var(--r)',
            padding: 'var(--s4)',
            transition: 'background 200ms, border-color 200ms',
        }}>
            {pendingChar && (
                <GuessModal
                    char={pendingChar}
                    onConfirm={() => makeGuess(pendingGuessId)}
                    onCancel={() => { if (!isGuessing) setPendingGuessId(null); }}
                    isConfirming={isGuessing}
                />
            )}


            <Grid container spacing={1.5} justifyContent="center">
                {characters.map((char) => {
                    const isSelected = selectedCharacters.has(char.id);
                    const isPendingGuess = isGuessMode && pendingGuessId === char.id;
                    return (
                        <Grid item key={char.id} sx={{ width: IMAGE_SIZE }}>
                            <Item
                                isSelected={isSelected}
                                isPendingGuess={isPendingGuess}
                                onClick={() => {
                                    if (isGuessMode) {
                                        setPendingGuessId(prev => prev === char.id ? null : char.id);
                                    } else {
                                        toggleCharacter(char.id);
                                    }
                                }}
                            >
                                <div className="flex flex-col items-center w-full">
                                    <img src={imgUrl(char.image)} alt={char.name} />
                                    <span className="character-name">{char.name}</span>
                                </div>
                            </Item>
                        </Grid>
                    );
                })}
            </Grid>
        </div>
    );
}
