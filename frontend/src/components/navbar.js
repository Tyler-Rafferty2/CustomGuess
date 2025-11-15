import { useContext, useState } from "react";
import { UserContext } from "@/context/UserContext";
import GoToPageButton from "../components/goToPageButton";

export default function Navbar() {
    const { user, logout } = useContext(UserContext);
    const [isClicked, setIsClicked] = useState(false);

    const handleLogout = () => {
        setIsClicked(true);
        setTimeout(() => {
            setIsClicked(false);
            logout();
        }, 200);
    };

    return (
        <nav className="bg-gray-800 text-white shadow-lg">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Left side - Brand/Logo placeholder */}
                    <div className="text-xl font-bold">
                        MyApp
                    </div>

                    {/* Right side - User info or auth buttons */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <span className="text-gray-300">
                                    Welcome, <span className="font-semibold text-white">{user.name}</span>
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className={`px-4 py-2 rounded transition-all duration-200 ${isClicked
                                            ? 'bg-red-800 scale-95'
                                            : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <GoToPageButton page="/signin" text="Sign In" />
                                <GoToPageButton page="/signup" text="Sign Up" />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}