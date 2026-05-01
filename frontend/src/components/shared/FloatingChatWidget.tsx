"use client";

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { postWithAuth } from "@/service/httpService";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const uid = () => Math.random().toString(36).slice(2);

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "Hi 👋 I'm your health assistant. I have access to your medical history and can help answer health-related questions. How can I help you today?",
  timestamp: new Date(),
};

// ─── Component ────────────────────────────────────────────────────────────────

const FloatingChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const toggleChat = () => setIsOpen((prev) => !prev);

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || isLoading) return;

    // Optimistically add user message
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setIsLoading(true);

    try {
      const res = await postWithAuth<{ reply: string }>("/chat", {
        message: text,
      });

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        text: res.data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        text: "Sorry, I couldn't connect right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* ── Chat Panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="mb-4 w-[350px] sm:w-[380px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col pointer-events-auto"
            style={{ height: "480px" }}
          >
            {/* Header */}
            <div className="bg-primary px-4 py-3.5 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-tight">
                    Health Assistant
                  </h3>
                  <p className="text-[11px] text-white/75 leading-tight">
                    Powered by your medical history
                  </p>
                </div>
              </div>
              <button
                onClick={toggleChat}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-sm"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`text-[10px] mt-1 block ${
                        msg.role === "user"
                          ? "text-white/60 text-right"
                          : "text-gray-400"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
              <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 px-3 py-2 pr-1 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask about your health..."
                  className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-gray-700 placeholder:text-gray-400"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
                <button
                  className={`p-2 rounded-full flex items-center justify-center transition-colors ${
                    message.trim() && !isLoading
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                  disabled={!message.trim() || isLoading}
                  onClick={sendMessage}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle Button ───────────────────────────────────────────────── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center relative pointer-events-auto"
        aria-label={isOpen ? "Close chat" : "Open chat"}
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
