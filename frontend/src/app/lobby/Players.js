"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Players({ user, setError, players, setPlayer }) {

    const router = useRouter();

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
            setPlayer(data);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    useEffect(() => {
        if (user?.id) {
            getPlayers();
        }
    }, [user?.id]);

    const goToLobby = (lobbyId) => {
        router.push(`/lobby/${lobbyId}`);
    };

    return (
        <div className="text-green-700 font-medium">
            <span className="text-gray-700">Players:</span>
            <ul className="mt-2">
                {players && players.length > 0 ? (
                    players.map((p) => (
                        <li key={p.id} className="flex items-center gap-2">
                            ID: {p.id}, Name: {p.userId}
                            <button
                                className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                onClick={() => goToLobby(p.lobbyId)}
                            >
                                Go to Lobby
                            </button>
                        </li>
                    ))
                ) : (
                    <li>No players found</li>
                )}
            </ul>
        </div>
    );

}
