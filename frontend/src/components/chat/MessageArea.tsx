import { SpinnerIcon } from "../ui/SpinnerIcon";
import { useAuth } from "@/context/AuthContext";
import { Message } from "@/types";
import { TypingAnimation } from "./TypingAnimation";

export const GeminiMessageArea = ({ messages, messagesEndRef }: { messages: Message[], messagesEndRef: React.RefObject<HTMLDivElement | null> }) => {
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