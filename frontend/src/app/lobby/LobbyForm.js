"use client";

export default function LobbyForm({ user, setError, setLobby }) {
    const handleCreate = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch("http://localhost:8080/lobby/create", {
                method: "POST",
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

            setLobby(data);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    return (
        <form onSubmit={handleCreate} className="flex flex-col gap-2 w-64">
            <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
                Create Lobby
            </button>
        </form>
    );
}
