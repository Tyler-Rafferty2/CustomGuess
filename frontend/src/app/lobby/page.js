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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <h1 className="text-2xl font-bold">Create Lobby</h1>

            <LobbyForm
                user={user}
                setError={setError}
                setLobby={setLobby}
            />

            <LobbyStatus error={error} lobby={lobby} />
            <Players
                user={user}
                setError={setError}
                players={players}
                setPlayers={setPlayers}
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
