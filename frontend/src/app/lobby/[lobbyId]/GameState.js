"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function Players({ user, setError, lobby, setLobby }) {
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
            setLobby(data);
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

    if (!lobby) {
        return <div>No game found</div>;
    }

    return (
        <div className="text-green-700 font-medium">
            <h2 className="text-gray-700 mb-2">Players:</h2>
            {/* <ul>
                {lobby.lobby.players.map((player) => (
                    <li key={player.id}>
                        {player.user.email || player.user.id}
                    </li>
                ))}
            </ul> */}
            {lobby.secretCharacter && (
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
            )}

            <h2 className="text-gray-700 mt-4 mb-2">Characters:</h2>
            <div className="grid grid-cols-4 gap-4">
                {lobby.lobby.characterSet.characters.map((char) => (
                    <div
                        key={char.id}
                        className="flex flex-col items-center cursor-pointer"
                        onClick={() => toggleCharacter(char.id)}
                    >
                        <div className="relative w-16 h-16">
                            <img
                                src={char.image}
                                alt={char.name}
                                className="w-full h-full object-cover rounded"
                            />
                            {selectedCharacters.has(char.id) && (
                                <div className="absolute inset-0 bg-gray-800 bg-opacity-70 rounded" />
                            )}
                        </div>
                        <span className="text-sm mt-1">{char.name}</span>
                    </div>
                ))}
            </div>

        </div>
    );
}