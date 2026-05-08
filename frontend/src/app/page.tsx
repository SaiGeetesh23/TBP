"use client";


import { AuthProvider, useAuth } from '@/context/AuthContext';
import React, { useState, useEffect } from 'react';
import { AuthPage } from '@/components/AuthPage';
import { ChatPage } from '@/components/ChatPage';


const AppContent = () => {
    const { token } = useAuth();
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    useEffect(() => {
        setIsAuthReady(true);
    }, []);

    if (!isAuthReady) {
        return null;
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