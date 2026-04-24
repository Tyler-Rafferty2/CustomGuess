"use client";
import { apiFetch } from '@/lib/api';

import { useRouter } from "next/navigation";
import { useState, useContext } from "react";
import { UserContext } from "@/context/UserContext";
import Link from "next/link";

export default function Signin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useContext(UserContext);

    const handleSignin = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await apiFetch(`/users/signin`, {
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

                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-[44px] px-4 pr-12 bg-[#F2EDE7] border border-[#DDD5CA] rounded-[6px] text-[#1A1510] placeholder-[#A0937F] focus:outline-none focus:border-[#C4B8A8] focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF] transition-colors duration-150"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0937F] hover:text-[#5C5047] transition-colors"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                            </button>
                        </div>
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