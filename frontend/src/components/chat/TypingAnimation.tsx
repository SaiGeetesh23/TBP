export const TypingAnimation = () => (
    <div className="flex items-center space-x-1.5 p-2">
        {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400/70 rounded-full animate-pulse" style={{ animationDuration: "1s", animationDelay: `${i * 300}ms` }}></div>)}
    </div>
);
