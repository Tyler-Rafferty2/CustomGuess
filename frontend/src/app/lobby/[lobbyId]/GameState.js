"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';

// Define a common image size for consistency (you can adjust this)
const IMAGE_SIZE = '120px';


export default function Players({ user, setError, lobby, setLobby, gameState, setGameState }) {
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

    const getGameState = async () => {
        setError(null);

        try {
            const res = await fetch(`http://localhost:8080/lobby/${lobbyID}`, {
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
        return <div>Loading game data...</div>;
    }

    const Item = styled(Paper)(({ theme, isSelected }) => ({
        // Use a background color to indicate selection
        backgroundColor: isSelected
            ? theme.palette.mode === 'dark' ? '#004d40' : '#e0f2f1' // Teal/light green for selected
            : theme.palette.mode === 'dark' ? '#1A2027' : '#fff', // Default color
        ...theme.typography.body2,
        padding: theme.spacing(1),
        textAlign: 'center',
        color: theme.palette.text.primary, // Changed text color for better visibility
        cursor: 'pointer',
        border: isSelected ? '2px solid #009688' : '1px solid #ccc', // Highlight border
        transition: 'all 0.2s',
        '& img': {
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            objectFit: 'cover',
            borderRadius: '4px',
            border: isSelected ? '3px solid #009688' : 'none', // Inner border for image
        }
    }));

    // This is the real data source you were using for characters
    const characters = gameState.lobby.characterSet.characters || [];

    return (
        <div className="text-green-700 font-medium">
            <h2 className="text-gray-700 mb-2">Players:</h2>
            {/* ... (Your Players list is commented out) */}

            {/* {lobby.secretCharacter && (
                <>
                    <h2 className="text-gray-700 mt-4 mb-2">Your Secret Character:</h2>
                    <div className="flex items-center justify-start mb-4">
                        <div className="flex flex-col items-center border-2 border-yellow-400 p-2 rounded">
                            <img
                                src={lobby.secretCharacter.image}
                                alt={lobby.secretCharacter.name}
                                className="w-20 h-20 object-cover rounded"
                            />
                            <span className="font-bold">{lobby.secretCharacter.name}</span>
                        </div>
                    </div>
                </>
            )} */}

            <h2 className="text-gray-700 mt-4 mb-2">Characters (The Grid):</h2>

            {/* **The main change: Using MUI Grid to display all characters** */}
            <Grid container spacing={2} justifyContent="center">
                {characters.map((char) => {
                    const isSelected = selectedCharacters.has(char.id);
                    return (
                        // Grid item: xs={6} for 2 columns, sm={4} for 3 columns, md={3} for 4 columns
                        <Grid item xs={6} sm={4} md={3} lg={2} key={char.id}>
                            <Item
                                isSelected={isSelected}
                                onClick={() => toggleCharacter(char.id)}
                                className="h-full" // Use h-full from Tailwind to make all Items the same height
                            >
                                <div className="flex flex-col items-center justify-between h-full">
                                    <img
                                        src={char.image}
                                        alt={char.name}
                                    />
                                    <span className="text-sm font-semibold mt-2">{char.name}</span>
                                </div>
                            </Item>
                        </Grid>
                    );
                })}
            </Grid>
            {/* **End of MUI Grid** */}

            {/* The old Tailwind-based character grid is now replaced by the MUI Grid above. 
                I'm commenting it out here, but you can remove it completely. 
                
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {lobby.lobby.characterSet.characters.map((char) => (
                    // ... (old character card structure)
                ))}
            </div> 
            */}
        </div>
    );
}