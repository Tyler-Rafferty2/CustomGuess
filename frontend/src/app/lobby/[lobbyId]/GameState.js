"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';

const IMAGE_SIZE = '160px';

export default function Players({ user, setError, lobby, setLobby, gameState, setGameState, isGuessMode, getGameState }) {
    const params = useParams();
    const lobbyID = params.lobbyId;
    const [selectedCharacters, setSelectedCharacters] = useState(new Set());

    const toggleCharacter = (charId) => {
        setSelectedCharacters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(charId)) {
                newSet.delete(charId);
            } else {
                newSet.add(charId);
            }
            return newSet;
        });
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
                body: JSON.stringify({
                    lobbyId: lobbyID,
                    characterId: charId
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }
            console.log("Fetched gamestate:", data);
            setGameState(data);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    useEffect(() => {
        if (user?.id) {
            getGameState();
        }
    }, [user?.id]);

    if (!gameState || !gameState.lobby || !gameState.lobby.characterSet) {
        return (
            <div className="flex items-center justify-center p-8 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-emerald-500 mr-4"></div>
                Loading game data...
            </div>
        );
    }

    const Item = styled(Paper)(({ theme, isSelected, isGuessMode }) => ({
        ...theme.typography.body2,
        padding: theme.spacing(1),
        textAlign: 'center',
        backgroundColor: 'rgba(71, 85, 105, 0.5)',
        color: '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        height: 'auto',
        minHeight: '240px',
        width: '190px',
        display: 'flex',
        flexDirection: 'column',
        border: '2px solid rgba(100, 116, 139, 0.3)',
        borderRadius: '12px',

        '&:hover': {
            transform: 'scale(1.05)',
            backgroundColor: 'rgba(71, 85, 105, 0.7)',
            borderColor: isGuessMode ? '#8b5cf6' : '#10b981',
            boxShadow: isGuessMode
                ? '0 0 20px rgba(139, 92, 246, 0.4)'
                : '0 0 20px rgba(16, 185, 129, 0.4)',
        },

        ...(isGuessMode && {
            border: '2px solid #8b5cf6',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
        }),

        '& img': {
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            objectFit: 'cover',
            borderRadius: '8px',
            flexShrink: 0,
        },

        '& .character-name': {
            marginTop: theme.spacing(1),
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: '1.25rem',
            padding: '0 4px 8px 4px',
            wordBreak: 'break-word',
        },

        ...(isSelected && {
            '&::after': {
                content: '""',
                position: 'absolute',
                top: theme.spacing(1),
                left: '50%',
                transform: 'translateX(-50%)',
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                backgroundColor: 'rgba(15, 23, 42, 1)',
                pointerEvents: 'none',
                borderRadius: '8px',
            }
        }),
    }));

    const characters = gameState.lobby.characterSet.characters || [];

    return (
        <div>
            {isGuessMode && (
                <div className="mb-6 p-4 bg-purple-500/20 border-2 border-purple-500 rounded-xl text-center">
                    <p className="text-white font-bold text-lg">🎯 Guess Mode Active</p>
                    <p className="text-purple-200 text-sm mt-1">Click on a character to make your final guess!</p>
                </div>
            )}

            <Grid container spacing={2} justifyContent="center">
                {characters.map((char) => {
                    const isSelected = selectedCharacters.has(char.id);
                    return (
                        <Grid item key={char.id}>
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
                                <div className="flex flex-col items-center">
                                    <img
                                        src={`http://localhost:8080` + char.image}
                                        alt={char.name}
                                    />
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