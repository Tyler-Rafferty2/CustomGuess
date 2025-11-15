"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link"; // Import Link for navigation

export default function Signup() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);

    const handleSignup = async (e) => {
        e.preventDefault();
        setError(null); // Clear previous errors

        try {
            const res = await fetch("http://localhost:8080/users/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Something went wrong");
                return;
            }

            router.push("/signin");
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
            <div className="w-full max-w-md bg-slate-800/50 border border-slate-700 rounded-xl p-8 shadow-lg backdrop-blur-sm">

                <h1 className="text-4xl font-bold text-center mb-6">Create an Account</h1>

                {error && (
                    <div className="text-red-400 bg-red-900/50 border border-red-500 rounded-lg p-3 text-center mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full px-6 py-3 mt-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-emerald-500/50"
                    >
                        Sign Up
                    </button>
                </form>

                <p className="text-center text-gray-400 mt-6">
                    Already have an account?{" "}
                    <Link href="/signin" className="text-emerald-400 hover:underline font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}