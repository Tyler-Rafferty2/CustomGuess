"use client";
import { API_URL } from '@/lib/api';

import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await fetch(`${API_URL}/users/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            // Always show success — backend never reveals if email exists
            setSubmitted(true);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#F7F3EE] p-6 font-sans">
            <div className="w-full max-w-md bg-[#FFFFFF] border border-[#DDD5CA] rounded-[6px] p-8">

                <h1 className="text-[26px] leading-[1.1] tracking-[-0.02em] font-bold text-center mb-2 font-serif text-[#1A1510]">
                    Forgot Password
                </h1>

                {!submitted ? (
                    <>
                        <p className="text-[14px] text-[#5C5047] text-center mb-6">
                            Enter your email and we&apos;ll send you a reset link.
                        </p>

                        {error && (
                            <div className="bg-[#FFFFFF] border border-[#DDD5CA] border-l-[3px] border-l-[#C0392B] rounded-[6px] p-3 mb-6 text-[#1A1510] text-[14px]">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label htmlFor="email" className="block text-[16px] font-semibold text-[#1A1510] mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-[44px] px-4 bg-[#F2EDE7] border border-[#DDD5CA] rounded-[6px] text-[#1A1510] placeholder-[#A0937F] focus:outline-none focus:border-[#C4B8A8] focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF] transition-colors duration-150"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-[44px] mt-2 bg-[#D9572B] hover:bg-[#B84422] active:bg-[#B84422] disabled:opacity-50 text-[#FFFFFF] text-[16px] font-semibold rounded-[6px] transition-colors duration-75 focus:outline-none focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF]"
                            >
                                {loading ? "Sending…" : "Send Reset Link"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center">
                        <p className="text-[14px] text-[#5C5047] mt-2 mb-6">
                            If that email is registered, a reset link is on its way. Check your inbox.
                        </p>
                        <Link
                            href="/signin"
                            className="text-[#D9572B] font-semibold text-[14px] hover:text-[#B84422] transition-colors"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                )}

                {!submitted && (
                    <p className="text-center text-[#5C5047] text-[14px] mt-6">
                        Remember it?{" "}
                        <Link
                            href="/signin"
                            className="text-[#D9572B] font-semibold hover:text-[#B84422] transition-colors"
                        >
                            Sign in
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}
