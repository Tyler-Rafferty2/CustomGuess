"use client";
import { apiFetch } from '@/lib/api';

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";

function EyeIcon({ open }) {
    return open ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
    );
}

function PasswordInput({ id, value, onChange, placeholder, required }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <input
                id={id}
                type={visible ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full h-[44px] px-4 pr-11 bg-[#F2EDE7] border border-[#DDD5CA] rounded-[6px] text-[#1A1510] placeholder-[#A0937F] focus:outline-none focus:border-[#C4B8A8] focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF] transition-colors duration-150"
                required={required}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0937F] hover:text-[#5C5047] transition-colors"
                tabIndex={-1}
                aria-label={visible ? "Hide password" : "Show password"}
            >
                <EyeIcon open={visible} />
            </button>
        </div>
    );
}

export default function Signup() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState(null);
    const [agreed, setAgreed] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
        setError(null);

        if (/\s/.test(username)) {
            setError("Username cannot contain spaces");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        if (!/[A-Z]/.test(password)) {
            setError("Password must contain at least one uppercase letter");
            return;
        }
        if (!/[0-9]/.test(password)) {
            setError("Password must contain at least one number");
            return;
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            setError("Password must contain at least one symbol");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!agreed) {
            setError("You must agree to the Terms and Privacy Policy");
            return;
        }

        try {
            const res = await apiFetch(`/users/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, username }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Something went wrong");
                return;
            }

            router.push("/signin?registered=1");
        } catch (err) {
            // console.error(err);
            setError("Network error");
        }
    };

    return (
        <>
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-[#F7F3EE] p-6 font-sans">
            <div className="w-full max-w-md bg-[#FFFFFF] border border-[#DDD5CA] rounded-[6px] p-8">
                <h1 className="text-[26px] leading-[1.1] tracking-[-0.02em] font-bold text-center mb-6 font-serif text-[#1A1510]">
                    Create an Account
                </h1>

                {error && (
                    <div className="bg-[#FFFFFF] border border-[#DDD5CA] border-l-[3px] border-l-[#C0392B] rounded-[6px] p-3 mb-6 text-[#1A1510] text-[14px]">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="username" className="block text-[16px] font-semibold text-[#1A1510] mb-2">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            placeholder="yourname"
                            value={username}
                            maxLength={20}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full h-[44px] px-4 bg-[#F2EDE7] border border-[#DDD5CA] rounded-[6px] text-[#1A1510] placeholder-[#A0937F] focus:outline-none focus:border-[#C4B8A8] focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF] transition-colors duration-150"
                            required
                        />
                    </div>

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

                    <div>
                        <label htmlFor="password" className="block text-[16px] font-semibold text-[#1A1510] mb-2">
                            Password
                        </label>
                        <PasswordInput
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-[16px] font-semibold text-[#1A1510] mb-2">
                            Confirm Password
                        </label>
                        <PasswordInput
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer mt-1">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-[3px] w-4 h-4 shrink-0 accent-[#D9572B] cursor-pointer"
                        />
                        <span className="text-[14px] text-[#5C5047] leading-[1.5]">
                            I agree to the{" "}
                            <Link href="/terms" className="text-[#D9572B] font-semibold hover:text-[#B84422] transition-colors" target="_blank">
                                Terms and Conditions
                            </Link>
                            {" "}and{" "}
                            <Link href="/privacy" className="text-[#D9572B] font-semibold hover:text-[#B84422] transition-colors" target="_blank">
                                Privacy Policy
                            </Link>
                        </span>
                    </label>

                    <button
                        type="submit"
                        className="w-full h-[44px] mt-2 bg-[#D9572B] hover:bg-[#B84422] active:bg-[#B84422] text-[#FFFFFF] text-[16px] font-semibold rounded-[6px] transition-colors duration-75 focus:outline-none focus:ring-2 focus:ring-[#D9572B] focus:ring-offset-2 focus:ring-offset-[#FFFFFF]"
                    >
                        Sign Up
                    </button>
                </form>

                <p className="text-center text-[#5C5047] text-[14px] mt-6">
                    Already have an account?{" "}
                    <Link
                        href="/signin"
                        className="text-[#D9572B] font-semibold hover:text-[#B84422] focus:outline-none focus:underline rounded-sm transition-colors"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
        </>
    );
}
