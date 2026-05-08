"use client";

import { AuthContextType } from "@/types/index";
import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};