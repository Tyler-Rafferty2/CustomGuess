"use client";

import { useState, useContext } from "react";
import { UserContext } from "@/context/UserContext";
import LobbyForm from "./LobbyForm";
import LobbyStatus from "./LobbyStatus";
import Players from "./Players";

export default function LobbyPage() {
    const { user } = useContext(UserContext);
    const [error, setError] = useState(null);
    const [lobby, setLobby] = useState(null);
    const [players, setPlayers] = useState(null);

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
                setPlayer={setPlayers}
            />
        </div>
    );
}
