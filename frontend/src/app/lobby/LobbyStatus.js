"use client";

export default function LobbyStatus({ error, lobby }) {
    if (error) {
        return <div className="text-red-600 font-medium">{error}</div>;
    }

    if (lobby) {
        return (
            <div className="text-green-700 font-medium">
                ✅ Lobby created successfully! <br />
                <span className="text-gray-700">Lobby ID:</span> {lobby.id}
            </div>
        );
    }

    return null;
}
