"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Players({ user, setError, lobbies, setLobbies }) {

    const router = useRouter();

    const getLobbies = async () => {
        setError(null);

        try {
            const res = await fetch(`http://localhost:8080/lobby/find`, {
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
            console.log("Fetched lobbies:", data);
            setLobbies(data);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    useEffect(() => {
        if (user?.id) {
            getLobbies();
        }
    }, [user?.id]);

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
        <div className="text-green-700 font-medium">
            <span className="text-gray-700">Lobbies you can join:</span>
            <ul className="mt-2">
                {lobbies && lobbies.length > 0 ? (
                    lobbies.map((l) => (
                        <li key={l.id} className="flex items-center gap-2">
                            ID: {l.id}, Code: {l.code}
                            <button
                                className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                onClick={() => joinLobby(l.code, l.id)}
                            >
                                Join Lobby
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
