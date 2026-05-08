import { InputBarProps } from "@/types";

export const GeminiInputBar = ({ currentMessage, setCurrentMessage, onSubmit, isStreaming }: InputBarProps) => (
    <form onSubmit={onSubmit} className="w-full max-w-4xl p-4">
        <div className="relative">
            <input type="text" value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} disabled={isStreaming} placeholder="Ask a question about ARGO float data..." className="w-full bg-[#1E1F20] border border-gray-600/50 rounded-full h-16 pl-6 pr-40 text-gray-200 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 space-x-2">
                <button type="submit" disabled={isStreaming || !currentMessage.trim()} className="p-2 rounded-full hover:bg-gray-700 disabled:opacity-50 transition-colors"></button>
            </div>
        </div>
    </form>
);