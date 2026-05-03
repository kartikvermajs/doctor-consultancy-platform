"use client";

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";

type Role = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  streaming?: boolean;
}

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const uid = () => Math.random().toString(36).slice(2);

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "Hi 👋 I'm your health assistant. I have access to your medical history and can help answer health-related questions. How can I help you today?",
  timestamp: new Date(),
};

const FloatingChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const toggleChat = () => setIsOpen((prev) => !prev);

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setIsLoading(true);

    // Placeholder streaming message
    const streamingId = uid();
    const streamingMsg: ChatMessage = {
      id: streamingId,
      role: "assistant",
      text: "",
      timestamp: new Date(),
      streaming: true,
    };
    setMessages((prev) => [...prev, streamingMsg]);

    try {
      const token = localStorage.getItem("token");
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          // Send full conversation history so AI can maintain multi-turn context
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      setIsLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId ? { ...m, text: accumulated } : m
          )
        );
        // Scroll during streaming
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }

      // Mark streaming as done
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId ? { ...m, streaming: false } : m
        )
      );
    } catch (err: any) {
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId
            ? {
                ...m,
                text: "Sorry, I couldn't connect right now. Please try again in a moment.",
                streaming: false,
              }
            : m
        )
      );
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
      {}
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
            {}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3.5 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shadow-sm">
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

            {}
            <div className="flex-1 p-4 overflow-y-auto bg-green-50/50 flex flex-col gap-3">
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
                        ? "bg-green-600 text-white rounded-br-sm shadow-sm"
                        : "bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-sm"
                    }`}
                  >
                    {msg.text ? (
                      <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                    ) : (
                      // Typing indicator for empty streaming messages
                      <div className="flex items-center gap-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    )}
                    {msg.streaming && msg.text && (
                      <span className="inline-block w-0.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse align-middle" />
                    )}
                    {!msg.streaming && (
                      <span
                        className={`text-[10px] mt-1 block ${
                          msg.role === "user"
                            ? "text-white/60 text-right"
                            : "text-gray-400"
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div ref={bottomRef} />
            </div>

            {}
            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
              <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 px-3 py-2 pr-1 focus-within:ring-1 focus-within:ring-green-600 focus-within:border-green-600 transition-all">
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
                      ? "bg-green-600 text-white shadow-sm hover:bg-green-700"
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

      {}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className="w-14 h-14 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-full shadow-xl flex items-center justify-center relative pointer-events-auto hover:from-green-700 hover:to-green-800 transition-colors"
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
