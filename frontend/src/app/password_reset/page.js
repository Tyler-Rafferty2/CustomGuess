"use client";
import { API_URL } from '@/lib/api';

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

function PasswordResetForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Invalid reset link. Please request a new one.");
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            if (!res.ok) {
                const text = await res.text();
                setError(text || "Something went wrong.");
                return;
            }

            setSuccess(true);
            setTimeout(() => router.push("/signin"), 2500);
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
                    Reset Password
                </h1>

                {success ? (
                    <div className="text-center">
                        <div className="bg-[#FFFFFF] border border-[#DDD5CA] border-l-[3px] border-l-[#27AE60] rounded-[6px] p-3 mb-6 text-[#1A1510] text-[14px]">
                            Password updated! Redirecting you to sign in…
                        </div>
                        <Link
                            href="/signin"
                            className="text-[#D9572B] font-semibold text-[14px] hover:text-[#B84422] transition-colors"
                        >
                            Go to Sign In
                        </Link>
                    </div>
                ) : (
                    <>
                        <p className="text-[14px] text-[#5C5047] text-center mb-6">
                            Choose a new password for your account.
                        </p>

                        {error && (
                            <div className="bg-[#FFFFFF] border border-[#DDD5CA] border-l-[3px] border-l-[#C0392B] rounded-[6px] p-3 mb-6 text-[#1A1510] text-[14px]">
                                {error}
                                {!token && (
                                    <span>
                                        {" "}
                                        <Link href="/forgot-password" className="text-[#D9572B] font-semibold hover:underline">
                                            Request a new link
                                        </Link>
                                    </span>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label htmlFor="password" className="block text-[16px] font-semibold text-[#1A1510] mb-2">
                                    New Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-[44px] px-4 bg-[#F2EDE7] border border-[#DDD5CA] rounded-[6px] text-[#1A1510] placeholder-[#A0937F] focus:outline-none focus:border-[#C4B8A8] focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF] transition-colors duration-150"
                                    required
                                    disabled={!token}
                                />
                            </div>

                            <div>
                                <label htmlFor="confirm" className="block text-[16px] font-semibold text-[#1A1510] mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirm"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    className="w-full h-[44px] px-4 bg-[#F2EDE7] border border-[#DDD5CA] rounded-[6px] text-[#1A1510] placeholder-[#A0937F] focus:outline-none focus:border-[#C4B8A8] focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF] transition-colors duration-150"
                                    required
                                    disabled={!token}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !token}
                                className="w-full h-[44px] mt-2 bg-[#D9572B] hover:bg-[#B84422] active:bg-[#B84422] disabled:opacity-50 text-[#FFFFFF] text-[16px] font-semibold rounded-[6px] transition-colors duration-75 focus:outline-none focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF]"
                            >
                                {loading ? "Updating…" : "Update Password"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default function PasswordResetPage() {
    return (
        <Suspense>
            <PasswordResetForm />
        </Suspense>
    );
}
