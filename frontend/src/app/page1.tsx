"use client";

import React, { useState, useEffect, createContext, useContext, useRef, FormEvent } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Plotly component for client-side rendering
const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
});

const API_URL = "http://127.0.0.1:8000";

// --- SVG ICONS ---
const SpinnerIcon = () => ( <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );

// --- TYPE DEFINITIONS ---
interface AuthContextType { token: string | null; setToken: (token: string | null) => void; logout: () => void; userName: string; }
interface CanvasContent { type: 'plotly'; data: string; }
interface Message { id: number; content: string; isUser: boolean; isLoading?: boolean; toolStatus?: string; }
interface InputBarProps { currentMessage: string; setCurrentMessage: (value: string) => void; onSubmit: (e: FormEvent) => void; isStreaming: boolean; }

// --- AUTHENTICATION CONTEXT ---
const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [userName, setUserName] = useState("User");

    const logout = React.useCallback(() => {
        setToken(null);
        localStorage.removeItem('FloatChat_token');
        setUserName("User");
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('FloatChat_token');
        if (storedToken) {
            setToken(storedToken);
            try {
                const payload = JSON.parse(atob(storedToken.split('.')[1]));
                const name = payload.sub.split('@')[0];
                const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
                setUserName(capitalizedName);
            } catch (e) {
                console.error("Failed to parse token:", e);
                logout();
            }
        }
    }, [logout]);

    const handleSetToken = (newToken: string | null) => {
        setToken(newToken);
        if (newToken) {
            localStorage.setItem('FloatChat_token', newToken);
             try {
                const payload = JSON.parse(atob(newToken.split('.')[1]));
                const name = payload.sub.split('@')[0];
                const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
                setUserName(capitalizedName);
            } catch (e) {
                console.error("Failed to parse new token:", e);
            }
        } else {
            logout();
        }
    };

    return (
        <AuthContext.Provider value={{ token, setToken: handleSetToken, logout, userName }}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};



const Canvas = ({ content }: { content: CanvasContent | null }) => {
    if (!content) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <div className="text-center">
                    <div className="text-2xl mb-4">🌊</div>
                    <p className="text-gray-500 text-lg">Your interactive visualizations will appear here.</p>
                </div>
            </div>
        );
    }

    if (content.type === 'plotly') {
        try {
            const plotData = JSON.parse(content.data);
            const layout = { ...plotData.layout, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#E2E2E2' }, xaxis: { ...plotData.layout.xaxis, gridcolor: 'rgba(255, 255, 255, 0.1)', }, yaxis: { ...plotData.layout.yaxis, gridcolor: 'rgba(255, 255, 255, 0.1)', } };
            return (
                <div className="w-full h-full p-4 rounded-lg">
                    <Plot data={plotData.data} layout={layout} style={{ width: '100%', height: '100%' }} useResizeHandler={true} />
                </div>
            );
        } catch (error) {
            console.error("Failed to parse or render Plotly JSON:", error);
            return <div className="text-red-500">Error rendering plot.</div>;
        }
    }
    return null;
};

const GeminiHeader = () => {
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

const GeminiInputBar = ({ currentMessage, setCurrentMessage, onSubmit, isStreaming }: InputBarProps) => (
    <form onSubmit={onSubmit} className="w-full max-w-4xl p-4">
        <div className="relative">
            <input type="text" value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} disabled={isStreaming} placeholder="Ask a question about ARGO float data..." className="w-full bg-[#1E1F20] border border-gray-600/50 rounded-full h-16 pl-6 pr-40 text-gray-200 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 space-x-2">
                <button type="submit" disabled={isStreaming || !currentMessage.trim()} className="p-2 rounded-full hover:bg-gray-700 disabled:opacity-50 transition-colors"></button>
            </div>
        </div>
    </form>
);
const TypingAnimation = () => (
    <div className="flex items-center space-x-1.5 p-2">
        {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400/70 rounded-full animate-pulse" style={{ animationDuration: "1s", animationDelay: `${i * 300}ms` }}></div>)}
    </div>
);

const GeminiMessageArea = ({ messages, messagesEndRef }: { messages: Message[], messagesEndRef: React.RefObject<HTMLDivElement | null> }) => {
    const { userName } = useAuth();
    return (
        <div className="flex-1 w-full overflow-y-auto px-4 pt-4 pb-10">
            {messages.map((message) => (
                <div key={message.id} className={`flex flex-col items-start ${message.isUser ? 'items-end' : ''} mb-6`}>
                    <div className={`text-sm font-bold mb-2 ${message.isUser ? "text-blue-400" : "text-gray-300"}`}>
                        {message.isUser ? userName : "FloatChat"}
                    </div>
                    <div className={`py-3 px-5 max-w-xl break-words whitespace-pre-wrap rounded-2xl ${ message.isUser ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white' : 'bg-[#1E1F20] text-gray-200' }`}>
                        {message.toolStatus && (
                            <div className="flex items-center text-xs text-gray-400 italic pb-2 border-b border-gray-600 mb-2">
                                <SpinnerIcon />
                                <span>{message.toolStatus}</span>
                            </div>
                        )}
                        {message.isLoading && !message.content && !message.toolStatus ? <TypingAnimation /> : message.content}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

const AuthPage = () => {
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

const ChatPage = () => {
    const { token, userName } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [conversationStarted, setConversationStarted] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [canvasContent, setCanvasContent] = useState<CanvasContent | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentMessage.trim() || isStreaming || !token) return;
        
        if (!conversationStarted) setConversationStarted(true);

        setIsStreaming(true);
        setCanvasContent(null);
        
        const userMessage: Message = { id: Date.now(), content: currentMessage, isUser: true };
        const aiResponsePlaceholder: Message = { id: Date.now() + 1, content: "", isUser: false, isLoading: true };

        setMessages(prev => [...prev, userMessage, aiResponsePlaceholder]);
        const userMessageContent = currentMessage;
        setCurrentMessage("");

        try {
            const response = await fetch(`${API_URL}/chat-stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({ message: userMessageContent }),
            });

            if (!response.body) return;
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    setMessages(prev => prev.map(msg => msg.id === aiResponsePlaceholder.id ? { ...msg, isLoading: false } : msg));
                    setIsStreaming(false);
                    break;
                };
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n').filter(line => line.trim());

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6);
                        try {
                            const data = JSON.parse(jsonStr);
                            
                            if (data.type === 'plot') {
                                setCanvasContent({ type: 'plotly', data: data.data });
                                continue; 
                            }

                            setMessages(prev => prev.map(msg => {
                                if (msg.id !== aiResponsePlaceholder.id) return msg;

                                const updatedMsg = { ...msg };
                                switch (data.type) {
                                    case 'tool_start':
                                        updatedMsg.toolStatus = data.content;
                                        updatedMsg.content = '';
                                        break;
                                    case 'summary':
                                        updatedMsg.content = data.content;
                                        updatedMsg.toolStatus = '';
                                        break;
                                    case 'content':
                                        updatedMsg.content = msg.content + data.content;
                                        updatedMsg.toolStatus = '';
                                        break;
                                    case 'end':
                                        updatedMsg.isLoading = false;
                                        break;
                                }
                                return updatedMsg;
                            }));

                            if (data.type === 'end') {
                                setIsStreaming(false);
                            }

                        } catch (e) { console.error("Error parsing stream chunk:", e, jsonStr); }
                    }
                }
            }
        } catch (error) {
            console.error("Fetch error:", error);
            setIsStreaming(false);
             setMessages(prev => prev.map(msg => msg.id === aiResponsePlaceholder.id ? { ...msg, isLoading: false, content: "Sorry, something went wrong." } : msg));
        }
    };
    
    return (
        <div className="w-full h-full flex flex-col bg-[#131314] text-white relative">
            <GeminiHeader />
            
            {!conversationStarted ? (
                // Welcome screen, centered.
                <div className="flex-grow flex flex-col items-center justify-center w-full pt-16">
                    <div className="flex flex-col items-center text-center px-4 mb-8">
                        <h1 className="text-5xl md:text-6xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text mb-4">
                            Hello, {userName}
                        </h1>
                        <p className="text-gray-400 text-lg">How can I help you today?</p>
                    </div>
                    <GeminiInputBar currentMessage={currentMessage} setCurrentMessage={setCurrentMessage} onSubmit={handleSubmit} isStreaming={isStreaming} />
                </div>
            ) : (
                // Main conversation view.
                <div className="w-full h-full flex flex-row pt-16">
                    <div className={`h-full flex flex-col transition-all duration-500 ease-in-out ${!!canvasContent ? "w-full md:w-3/5" : "w-full"}`}>
                        <div className="flex-grow overflow-y-auto w-full flex justify-center min-h-0">
                            <GeminiMessageArea messages={messages} messagesEndRef={messagesEndRef} />
                        </div>
                        <div className="flex-shrink-0 flex justify-center w-full">
                           <GeminiInputBar currentMessage={currentMessage} setCurrentMessage={setCurrentMessage} onSubmit={handleSubmit} isStreaming={isStreaming} />
                        </div>
                    </div>
                    {/* UPDATED: Conditionally render the canvas container */}
                    {!!canvasContent && (
                        <div className="hidden md:flex flex-grow h-full">
                            <Canvas content={canvasContent} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AppContent = () => {
    const { token } = useAuth();
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    useEffect(() => {
        setIsAuthReady(true);
    }, []);

    if (!isAuthReady) {
        return null; // Prevents UI flicker on initial load
    }

    return (
        <div className="w-full h-full flex justify-center items-center">
            {token ? <ChatPage /> : <AuthPage />}
        </div>
    );
};

export default function Home() {
    return (
        <AuthProvider>
            <main className="flex justify-center items-center bg-[#131314] min-h-screen h-screen">
                <AppContent />
            </main>
        </AuthProvider>
    );
}