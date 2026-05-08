import {FormEvent} from 'react';

export interface AuthContextType { token: string | null; setToken: (token: string | null) => void; logout: () => void; userName: string; }
export interface CanvasContent { type: 'plotly'; data: string; }
export interface Message { id: number; content: string; isUser: boolean; isLoading?: boolean; toolStatus?: string; }
export interface InputBarProps { currentMessage: string; setCurrentMessage: (value: string) => void; onSubmit: (e: FormEvent) => void; isStreaming: boolean; }