"use client";

import { useEffect, useState } from "react";
import { imgUrl } from "@/lib/imgUrl";
import { useParams } from "next/navigation";
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { Loader2 } from "lucide-react";

const IMAGE_SIZE = '140px';

export default function Players({ user, setError, lobby, setLobby, gameState, setGameState, isGuessMode, getGameState }) {
    const params = useParams();
    const lobbyID = params.lobbyId;
    const [selectedCharacters, setSelectedCharacters] = useState(new Set());

    // Seed eliminated characters from server on load / refresh
    useEffect(() => {
        const ids = gameState?.eliminatedCharacters;
        if (Array.isArray(ids)) {
            setSelectedCharacters(new Set(ids));
        }
    }, [gameState?.eliminatedCharacters?.join?.(",")]);

    const toggleCharacter = async (charId) => {
        // Optimistic update
        setSelectedCharacters(prev => {
            const next = new Set(prev);
            if (next.has(charId)) next.delete(charId);
            else next.add(charId);
            return next;
        });

        try {
            await fetch("http://localhost:8080/lobby/move", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
                body: JSON.stringify({ lobbyId: lobbyID, characterId: charId }),
            });
        } catch {
            // Persisting failed — state will re-sync on next getGameState call
        }
    };

    const makeGuess = async (charId) => {
        setError(null);
        try {
            console.log("Making guess for character ID:", user?.id);
            const res = await fetch(`http://localhost:8080/lobby/guess`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID": user?.id,
                },
                body: JSON.stringify({ lobbyId: lobbyID, characterId: charId }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Something went wrong");
                return;
            }
            getGameState();
        } catch (err) {
            console.error(err);
            setError("Network error");
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

    const Item = styled(Paper)(({ theme, isSelected, isGuessMode }) => ({
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
        border: isGuessMode ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 'var(--r)',
        boxShadow: 'none',

        '&:hover': {
            transform: 'translateY(-2px)',
            backgroundColor: 'var(--surface-1)',
            borderColor: isGuessMode ? 'var(--accent-dim)' : 'var(--border-strong)',
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
                backgroundColor: 'rgba(26, 21, 16, 0.55)',
                pointerEvents: 'none',
                borderRadius: 'calc(var(--r) - 2px)',
            }
        }),
    }));

    const characters = gameState.lobby.lobbyCharacters || [];

    return (
        <div>
            {/* Guess mode banner */}
            {isGuessMode && (
                <div style={{
                    marginBottom: 'var(--s5)',
                    padding: 'var(--s3) var(--s4)',
                    background: 'var(--accent-light)',
                    border: '1px solid var(--accent)',
                    borderRadius: 'var(--r)',
                    textAlign: 'center',
                }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'var(--accent-dim)', margin: 0 }}>
                        Guess mode — click a character to make your final guess
                    </p>
                </div>
            )}

            <Grid container spacing={1.5} justifyContent="center">
                {characters.map((char) => {
                    const isSelected = selectedCharacters.has(char.id);
                    return (
                        <Grid item key={char.id} sx={{ width: IMAGE_SIZE }}>
                            <Item
                                isSelected={isSelected}
                                isGuessMode={isGuessMode}
                                onClick={() => {
                                    if (isGuessMode) {
                                        makeGuess(char.id);
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