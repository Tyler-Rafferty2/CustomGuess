"use client";

import { useState, useContext } from "react";
import { useParams } from "next/navigation";
import { UserContext } from "@/context/UserContext";
import GameState from "./GameState";
import ChatApp from '@/components/chatapp';

export default function LobbyPage() {
    const { user } = useContext(UserContext);
    const [error, setError] = useState(null);
    const [lobby, setLobby] = useState(null);

    const params = useParams();
    const lobbyID = params.lobbyId;

    console.log(user);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <h1 className="text-2xl font-bold">Game State </h1>

            <GameState
                user={user}
                setError={setError}
                lobby={lobby}
                setLobby={setLobby}
            />
            {user && user.email && lobbyID && (
                <ChatApp
                    lobbyId={lobbyID}
                    username={user.email}
                    userId={user.id}
                />
            )}
        </div>
    );
}
