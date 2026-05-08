import { useAuth } from "@/context/AuthContext";
import { useState, FormEvent } from "react";

const API_URL = "http://127.0.0.1:8000";

export const AuthPage = () => {
    const { setToken } = useAuth();
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleAuth = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const url = `${API_URL}/${isLogin ? 'login' : 'signup'}`;
        const headers = isLogin ? { 'Content-Type': 'application/x-www-form-urlencoded' } : { 'Content-Type': 'application/json' };
        const body = isLogin ? new URLSearchParams({ username: email, password: password }) : JSON.stringify({ username, email, password });
        
        try {
            const response = await fetch(url, { method: 'POST', headers, body: body });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Authentication failed');
            setToken(data.access_token);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError('An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-8 bg-[#1E1F20] rounded-2xl shadow-lg border border-gray-700 text-white">
            <h2 className="text-3xl font-bold text-center text-gray-200 mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-center text-gray-400 mb-8">{isLogin ? "Login to" : "Signup for"} your FloatChat account</p>
            <form onSubmit={handleAuth}>
                {!isLogin && ( <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required className="w-full px-4 py-3 mb-4 bg-[#2f3031] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"/> )}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" required className="w-full px-4 py-3 mb-4 bg-[#2f3031] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className="w-full px-4 py-3 mb-6 bg-[#2f3031] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
                {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50">
                    {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                </button>
            </form>
            <p className="text-center text-sm text-gray-400 mt-6">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-blue-400 hover:text-blue-300 font-semibold ml-1">
                    {isLogin ? 'Sign Up' : 'Login'}
                </button>
            </p>
        </div>
    );
};