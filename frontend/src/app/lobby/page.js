"use client";

import { useState, useContext } from "react";
import { UserContext } from "@/context/UserContext";
import LobbyForm from "./LobbyForm";
import LobbyStatus from "./LobbyStatus";
import Players from "./Players";
import OpenGames from "./OpenGames";

export default function LobbyPage() {
    const { user } = useContext(UserContext);
    const [error, setError] = useState(null);
    const [lobby, setLobby] = useState(null);
    const [players, setPlayers] = useState(null);
    const [lobbies, setLobbies] = useState(null);

    const getPlayers = async () => {
        setError(null);

        try {
            const res = await fetch(`http://localhost:8080/player/`, {
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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <h1 className="text-2xl font-bold">Create Lobby</h1>

            <LobbyForm
                user={user}
                setError={setError}
                setLobby={setLobby}
                getPlayers={getPlayers}
            />

            <LobbyStatus error={error} lobby={lobby} />
            <Players
                user={user}
                setError={setError}
                players={players}
                setPlayers={setPlayers}
                getPlayers={getPlayers}
            />
            <OpenGames
                user={user}
                setError={setError}
                lobbies={lobbies}
                setLobbies={setLobbies}
            />
        </div>
    );
}
