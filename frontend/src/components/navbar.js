import { useContext } from "react";
import { UserContext } from "@/context/UserContext";

export default function Navbar() {
    const { user, logout } = useContext(UserContext);

    return (
        <nav className="p-4 bg-gray-800 text-white flex justify-between">
            {user ? (
                <>
                    <span>Welcome, {user.name}</span>
                    <button onClick={logout}>Logout</button>
                </>
            ) : (
                <span>Please login</span>
            )}
        </nav>
    );
}
