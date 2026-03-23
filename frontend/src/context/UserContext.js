"use client";
import { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null); // null if not logged in

    useEffect(() => {
        // First check for registered user
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            setUser(JSON.parse(savedUser));
            return;
        }

        // If no registered user, check for/create guest
        let guestId = localStorage.getItem("guestId");
        if (!guestId) {
            guestId = crypto.randomUUID();
            localStorage.setItem("guestId", guestId);
        }

        // Set guest user
        setUser({
            id: guestId,
            email: "guest",
            isGuest: true,
        });
    }, []);

    const login = (userData) => {
        // When logging in, remove guest data
        localStorage.removeItem("guestId");
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
    };

    const logout = () => {
        // On logout, create a new guest identity
        const guestId = crypto.randomUUID();
        localStorage.setItem("guestId", guestId);

        setUser({
            id: guestId,
            email: "guest",
            isGuest: true,
        });

        localStorage.removeItem("user");
    };


    return (
        <UserContext.Provider value={{ user, login, logout }}>
            {children}
        </UserContext.Provider>
    );
};