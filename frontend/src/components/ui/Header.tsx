import { useAuth } from "@/context/AuthContext";

export const GeminiHeader = () => {
    const { userName, logout } = useAuth();
    const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';
    return (
        <header className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10 w-full">
            <div className="flex items-center space-x-2">
                <span className="font-semibold text-lg text-gray-300">FloatChat</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400"><path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="flex items-center space-x-4">
                <button onClick={logout} className="text-sm text-gray-300 hover:text-white transition-colors">Logout</button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {userInitial}
                </div>
            </div>
        </header>
    );
}