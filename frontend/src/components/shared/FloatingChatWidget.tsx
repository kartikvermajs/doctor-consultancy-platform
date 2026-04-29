"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";

const FloatingChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20, originX: 1, originY: 1 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="mb-4 w-[350px] sm:w-[380px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col pointer-events-auto"
                        style={{ height: "450px" }}
                    >
                        {/* Header */}
                        <div className="bg-primary px-4 py-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                    <MessageCircle className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-sm">Chat Assistant</h3>
                                    <p className="text-xs text-white/80">Typically replies in minutes</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleChat}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                aria-label="Close Chat"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
                            <div className="self-start max-w-[85%] bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                                <p className="text-sm text-gray-700">
                                    Hi 👋, how can I help you today?
                                </p>
                                <span className="text-[10px] text-gray-400 mt-1 block">Just now</span>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-gray-100">
                            <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 px-3 py-2 pr-1 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-gray-700"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && message.trim()) {
                                            setMessage("");
                                        }
                                    }}
                                />
                                <button
                                    className={`p-2 rounded-full flex items-center justify-center transition-colors ${message.trim() ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
                                        }`}
                                    disabled={!message.trim()}
                                    onClick={() => setMessage("")}
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleChat}
                className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center relative pointer-events-auto"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <X className="w-6 h-6" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="chat"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <MessageCircle className="w-6 h-6" />
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.button>
        </div>
    );
};

export default FloatingChatWidget;
