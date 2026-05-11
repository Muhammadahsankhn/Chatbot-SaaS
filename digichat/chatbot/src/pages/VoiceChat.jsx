import React from 'react';
import VoiceBot from '../components/VoiceBot';

const VoiceChat = () => {
    return (
        <div className="relative">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Voice Interactive Assistant
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Experience hands-free interaction with our advanced AI voice bot.
                </p>
            </div>

            <div className="bg-white dark:bg-[#16161e] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm p-8 min-h-[70vh] flex items-center justify-center">
                <VoiceBot />
            </div>
        </div>
    );
};

export default VoiceChat;
