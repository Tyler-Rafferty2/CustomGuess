"use client";
import { createContext, useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        apiFetch("/auth/session", { method: "POST" })
            .then(async (res) => {
                const data = await res.json();
                if (res.status === 401 && data.expired) {
                    // Registered session expired — show null so navbar shows Sign In
                    setUser(null);
                } else {
                    setUser(data);
                }
            })
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, []);

    const login = (userData) => {
        // Session cookie already set by the backend signin endpoint
        setUser(userData);
    };

    const updateUser = (userData) => {
        setUser(userData);
    };

    const logout = async () => {
        await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
        const res = await apiFetch("/auth/session", { method: "POST" }).catch(() => null);
        if (res) {
            const data = await res.json().catch(() => null);
            setUser(data);
        } else {
            setUser(null);
        }
    };

    return (
        <UserContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
            {children}
        </UserContext.Provider>
    );
};
