import { useAuth } from "@/context/AuthContext";
import { useState, FormEvent, useEffect, useRef } from "react";
import { Message } from "@/types";
import { CanvasContent } from "@/types";
import { GeminiHeader } from "./ui/Header";
import { GeminiInputBar } from "./chat/MessageInput";
import { GeminiMessageArea } from "./chat/MessageArea";
import { API_URL } from "@/lib/constants";
import { Canvas } from "./viz/Canvas";

export const ChatPage = () => {
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
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });

                while (buffer.includes('\n\n')) {
                    const messageEndIndex = buffer.indexOf('\n\n');
                    const message = buffer.substring(0, messageEndIndex);
                    buffer = buffer.substring(messageEndIndex + 2);

                    if (message.startsWith('data: ')) {
                        const jsonStr = message.substring(6);
                        if (!jsonStr) continue;

                        try {
                            const data = JSON.parse(jsonStr);
                            
                            if (data.type === 'plot') {
                                setCanvasContent({ type: 'plotly', data: data.data });
                            }

                            setMessages(prev => prev.map(msg => {
                                if (msg.id !== aiResponsePlaceholder.id) return msg;
                                const updatedMsg = { ...msg };
                                switch (data.type) {
                                    case 'tool_start':
                                        updatedMsg.toolStatus = data.content;
                                        updatedMsg.content = '';
                                        break;
                                    case 'content':
                                        updatedMsg.content = (msg.content || "") + data.content;
                                        updatedMsg.toolStatus = undefined;
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
                        } catch (e) { 
                            console.error("Error parsing a complete message chunk:", e, jsonStr); 
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Fetch error:", error);
            setMessages(prev => prev.map(msg => 
                msg.id === aiResponsePlaceholder.id ? { ...msg, isLoading: false, content: "Sorry, an error occurred." } : msg
            ));
        } finally {
          setIsStreaming(false);
          setMessages(prev => prev.map(msg => 
            msg.id === aiResponsePlaceholder.id ? { ...msg, isLoading: false } : msg
          ));
        }
    };
    
    return (
        <div className="w-full h-full flex flex-col bg-[#131314] text-white relative">
            <GeminiHeader />
            
            {!conversationStarted ? (
                // Welcome screen
                <div className="flex-grow flex flex-col items-center justify-center w-full pt-16">
                    <div className="flex flex-col items-center text-center px-4 mb-8">
                        <h1 className="text-5xl md:text-6xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text mb-4">
                            Hello, {userName}
                        </h1>
                        <p className="text-gray-400 text-lg">How can I help you explore ocean data today?</p>
                    </div>
                    <GeminiInputBar currentMessage={currentMessage} setCurrentMessage={setCurrentMessage} onSubmit={handleSubmit} isStreaming={isStreaming} />
                </div>
            ) : (
                // Main conversation view
                <div className="w-full h-full flex flex-row pt-16">
                    <div className={`h-full flex flex-col transition-all duration-500 ease-in-out ${!!canvasContent ? "w-full md:w-3/5" : "w-full"}`}>
                        <div className="flex-grow overflow-y-auto w-full flex justify-center min-h-0">
                            <GeminiMessageArea messages={messages} messagesEndRef={messagesEndRef} />
                        </div>
                        <div className="flex-shrink-0 flex justify-center w-full">
                           <GeminiInputBar currentMessage={currentMessage} setCurrentMessage={setCurrentMessage} onSubmit={handleSubmit} isStreaming={isStreaming} />
                        </div>
                    </div>
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

export default ChatPage;