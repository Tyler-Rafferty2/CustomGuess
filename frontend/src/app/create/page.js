"use client";

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

    const router = useRouter();

    console.log("lobby user", user)

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

    const joinLobby = async (lobbyCode, lobbyID) => {
        setError(null);

        try {
            const res = await fetch(`http://localhost:8080/lobby/join`, {
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

    return (
        <div className="h-screen w-full overflow-hidden">
            <LobbyForm
                user={user}
                setError={setError}
                setLobby={setLobby}
                getPlayers={getPlayers}
            />
        </div>
    );
}
