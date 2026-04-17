"use client";
import { API_URL } from '@/lib/api';

import { useRouter } from "next/navigation";
import { useState, useContext } from "react";
import { UserContext } from "@/context/UserContext";
import Link from "next/link";

export default function Signin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);

    const { login } = useContext(UserContext);

    const handleSignin = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch(`${API_URL}/users/signin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error);
                return;
            }

            login(data);
            router.push("/");
        } catch (err) {
            // console.error(err);
            setError("Network error");
        }
    };

    return (
        /* --bg (#F7F3EE) */
        <div className="flex items-center justify-center min-h-screen bg-[#F7F3EE] p-6 font-sans">

            {/* --surface-0 (#FFFFFF) with --border (#DDD5CA) and strict 6px radius */}
            <div className="w-full max-w-md bg-[#FFFFFF] border border-[#DDD5CA] rounded-[6px] p-8">

                {/* --text-xl (26px), Fraunces (font-serif), --text-900 (#1A1510) */}
                <h1 className="text-[26px] leading-[1.1] tracking-[-0.02em] font-bold text-center mb-6 font-serif text-[#1A1510]">
                    Welcome Back
                </h1>

                {error && (
                    /* Adhering to the Toast/Error spec: --state-out (#C0392B) for the left border accent */
                    <div className="bg-[#FFFFFF] border border-[#DDD5CA] border-l-[3px] border-l-[#C0392B] rounded-[6px] p-3 mb-6 text-[#1A1510] text-[14px]">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignin} className="flex flex-col gap-4">
                    <div>
                        {/* --text-md (16px), --text-900 (#1A1510) */}
                        <label htmlFor="email" className="block text-[16px] font-semibold text-[#1A1510] mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            /* --surface-1 (#F2EDE7), strict 6px radius, --border (#DDD5CA), --accent (#D9572B) focus ring */
                            className="w-full h-[44px] px-4 bg-[#F2EDE7] border border-[#DDD5CA] rounded-[6px] text-[#1A1510] placeholder-[#A0937F] focus:outline-none focus:border-[#C4B8A8] focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF] transition-colors duration-150"
                            required
                        />
                    </div>

                    <div>
                        {/* This container pushes the label to the left and the link to the right */}
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="password" className="text-[16px] font-semibold text-[#1A1510]">
                                Password
                            </label>
                            <a
                                href="/forgot-password"
                                className="text-[14px] font-medium text-[#D9572B] hover:underline"
                            >
                                Forgot password?
                            </a>
                        </div>

                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-[44px] px-4 bg-[#F2EDE7] border border-[#DDD5CA] rounded-[6px] text-[#1A1510] placeholder-[#A0937F] focus:outline-none focus:border-[#C4B8A8] focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF] transition-colors duration-150"
                            required
                        />
                    </div>


                    <button
                        type="submit"
                        /* --accent (#D9572B) fill, --accent-dim (#B84422) hover/active, strict 6px radius, tight 80ms interaction */
                        className="w-full h-[44px] mt-4 bg-[#D9572B] hover:bg-[#B84422] active:bg-[#B84422] text-[#FFFFFF] text-[16px] font-semibold rounded-[6px] transition-colors duration-75 focus:outline-none focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF]"
                    >
                        Sign In
                    </button>
                </form>

                {/* --text-sm (14px), --text-600 (#5C5047) */}
                <p className="text-center text-[#5C5047] text-[14px] mt-6">
                    Don&apos;t have an account?{" "}
                    {/* --accent (#D9572B) link */}
                    <Link
                        href="/signup"
                        className="text-[#D9572B] font-semibold hover:text-[#B84422] focus:outline-none focus:underline rounded-sm transition-colors"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}