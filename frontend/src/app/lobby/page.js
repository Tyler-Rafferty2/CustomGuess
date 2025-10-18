"use client";

import { useRouter } from "next/navigation";
import { useState, useContext } from "react";
import { UserContext } from "@/context/UserContext";

export default function Lobby() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);

    const { user, logout } = useContext(UserContext);

    const handleCreate = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch("http://localhost:8080/lobby/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID": user?.id
                },
            });

            const data = await res.json();

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Something went wrong");
                return;
            }
            console.log(data);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <h1 className="text-2xl font-bold">Create Lobby</h1>
            <form onSubmit={handleCreate} className="flex flex-col gap-2 w-64">
                <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                    Create Libby
                </button>
            </form>
        </div>
    );
}
