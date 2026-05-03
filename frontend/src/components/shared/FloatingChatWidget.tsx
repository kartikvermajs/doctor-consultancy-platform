"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Loader2, Bot, Maximize2, Minimize2 } from "lucide-react";


const PROMPTS = [
  "Hey… missed me?",
  "Got something bothering you?",
  "Ask me anything",
  "Still ignoring your health?",
  "Quick checkup? I'm free.",
  "Don't google it… ask me.",
  "I might actually help, you know.",
  "That headache again?",
  "You look like you have questions.",
  "Tap me. I dare you.",
];

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [isLoading, setIsLoading] = useState(false);

  const [promptIdx, setPromptIdx] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const promptTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reveal bubble after 2.5 s, rotate every 4 s; pause while chat is open
  useEffect(() => {
    if (isOpen) {
      setShowBubble(false);
      if (promptTimerRef.current) clearInterval(promptTimerRef.current);
      return;
    }
    const reveal = setTimeout(() => setShowBubble(true), 2500);
    promptTimerRef.current = setInterval(
      () => setPromptIdx((i) => (i + 1) % PROMPTS.length),
      4000
    );
    return () => {
      clearTimeout(reveal);
      if (promptTimerRef.current) clearInterval(promptTimerRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const toggleChat = () => {
    if (isOpen) {
      if (isExpanded) {
        setIsExpanded(false);
        setTimeout(() => setIsOpen(false), 300);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(true);
    }
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setIsLoading(true);

    const streamingId = uid();
    setMessages((prev) => [
      ...prev,
      { id: streamingId, role: "assistant", text: "", timestamp: new Date(), streaming: true },
    ]);

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
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok || !response.body) throw new Error(`Server error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      setIsLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === streamingId ? { ...m, text: accumulated } : m))
        );
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === streamingId ? { ...m, streaming: false } : m))
      );
    } catch {
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId
            ? { ...m, text: "Sorry, I couldn't connect right now. Please try again in a moment.", streaming: false }
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
    <div className="fixed bottom-6 right-6 z-50 w-0 h-0">


      <AnimatePresence>
        {isOpen && isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isOpen && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            style={{
              transformOrigin: "bottom right",
            }}
            className={`bg-white overflow-hidden border border-gray-100 flex flex-col pointer-events-auto ${
              isExpanded
                ? "fixed z-[60] inset-0 md:m-auto md:w-[500px] md:h-[80vh] w-full h-full rounded-none md:rounded-2xl shadow-2xl"
                : "absolute z-[60] bottom-[72px] right-0 w-[min(380px,calc(100vw-3rem))] h-[480px] rounded-2xl shadow-2xl"
            }`}
          >

            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3.5 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-tight">Health Assistant</h3>
                  <p className="text-[11px] text-white/75 leading-tight">Powered by your medical history</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                  aria-label={isExpanded ? "Minimize Chat" : "Maximize Chat"}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleChat}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Close Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>


            <div className="flex-1 p-4 overflow-y-auto bg-green-50/50 flex flex-col gap-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                      ? "bg-green-600 text-white rounded-br-sm shadow-sm"
                      : "bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-sm"
                      }`}
                  >
                    {msg.text ? (
                      <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                    ) : (
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
                        className={`text-[10px] mt-1 block ${msg.role === "user" ? "text-white/60 text-right" : "text-gray-400"
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
                  className={`p-2 rounded-full flex items-center justify-center transition-colors ${message.trim() && !isLoading
                    ? "bg-green-600 text-white shadow-sm hover:bg-green-700"
                    : "bg-gray-200 text-gray-400"
                    }`}
                  disabled={!message.trim() || isLoading}
                  onClick={sendMessage}
                  aria-label="Send message"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {!isOpen && (
          <motion.div
            key="launcher"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", damping: 20, stiffness: 280 }}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "18px",
              transformOrigin: "bottom right",
            }}
          >

            <AnimatePresence>
              {showBubble && (
                <motion.button
                  key="bubble"
                  onClick={toggleChat}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 8 }}
                  transition={{ type: "spring", damping: 20, stiffness: 320 }}
                  className="relative cursor-pointer text-left"
                  aria-label="Open CuraBot"
                >
                  <div
                    className="rounded-2xl rounded-br-sm px-5 py-2.5 max-w-[250px] border border-green-200/60 bg-green-50/95"
                    style={{
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      boxShadow: "0 6px 24px rgba(22,163,74,0.18), 0 1px 4px rgba(0,0,0,0.08)",
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={promptIdx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.22 }}
                        className="text-[13px] font-semibold text-green-600 whitespace-nowrap leading-snug"
                      >
                        {PROMPTS[promptIdx]}
                      </motion.p>
                    </AnimatePresence>
                  </div>

                  <div
                    className="absolute right-5 -bottom-[5px] w-2.5 h-2.5 rotate-45 border-b border-r border-green-200/60 bg-green-50/95"
                  />
                </motion.button>
              )}
            </AnimatePresence>


            <motion.button
              onClick={toggleChat}
              aria-label="Open CuraBot chat"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
              className="relative flex items-center justify-center cursor-pointer"
            >

              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ inset: "-6px" }}
                animate={{
                  boxShadow: [
                    "0 0 0 0px rgba(34,197,94,0.55)",
                    "0 0 0 14px rgba(34,197,94,0)",
                  ],
                }}
                transition={{ repeat: Infinity, duration: 2.6, ease: "easeOut" }}
              />

              <div
                className="relative w-[70px] h-[70px] sm:w-[64px] sm:h-[64px] rounded-full overflow-hidden"
                style={{
                  boxShadow: "0 8px 32px rgba(22,163,74,0.45), 0 2px 8px rgba(0,0,0,0.12)",
                  border: "3px solid rgba(255,255,255,0.9)",
                }}
              >
                <Image src="/chatbot.png" alt="CuraBot" fill className="object-cover" priority />
              </div>

              <motion.div
                className="absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white bg-yellow-400"
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isOpen && (
          <motion.button
            key="close-fab"
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 90, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 300 }}
            onClick={toggleChat}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Close CuraBot chat"
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: "56px",
              height: "56px",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              boxShadow: "0 6px 24px rgba(22,163,74,0.4)",
              transformOrigin: "center",
            }}
          >
            <X className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
};

export default FloatingChatWidget;
