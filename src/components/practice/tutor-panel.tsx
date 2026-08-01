"use client";

/**
 * MathVerse — Tutor Panel
 *
 * Inline floating chat panel that opens when the learner clicks "Ask Tutor"
 * during practice. Calls POST /api/tutor with the active questionId so the
 * AI assistant has full context.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  X, Send, Loader2, Lightbulb, RotateCcw, GraduationCap, Sparkles,
} from "lucide-react";
import type { TutorMessage, TutorResponse } from "@/lib/types";

interface TutorPanelProps {
  open: boolean;
  onClose: () => void;
  questionId?: string;
}

const QUICK_PROMPTS = [
  "Give me a hint",
  "Explain this step by step",
  "What formula should I use?",
  "Show me an example",
];

export function TutorPanel({ open, onClose, questionId }: TutorPanelProps) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [suggestedActions, setSuggestedActions] = useState<TutorResponse["suggestedActions"]>([]);
  const [typedReply, setTypedReply] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset when panel opens with a new question
  useEffect(() => {
    if (open) {
      setMessages([]);
      setSessionId(undefined);
      setSuggestedActions([]);
      setTypedReply(null);
      // Welcome message
      setMessages([{
        role: "assistant",
        content: "Hi there! I'm Coach Quark 🧑‍🏫 — your friendly math tutor. Ask me anything about this question!",
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [open, questionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typedReply]);

  async function send(messageText: string) {
    const text = messageText.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: TutorMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setSuggestedActions([]);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          questionId,
          sessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tutor unavailable");
      setSessionId(data.sessionId);
      setSuggestedActions(data.suggestedActions ?? []);
      // Typewriter effect
      await typewrite(data.reply);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reach tutor");
      setMessages((m) => [...m, {
        role: "assistant",
        content: "Sorry, I had trouble responding just now. Try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function typewrite(text: string) {
    setTypedReply("");
    const chunk = Math.max(2, Math.floor(text.length / 80));
    for (let i = 0; i <= text.length; i += chunk) {
      setTypedReply(text.slice(0, i));
      await new Promise((r) => setTimeout(r, 16));
    }
    setMessages((m) => [...m, {
      role: "assistant",
      content: text,
      timestamp: new Date().toISOString(),
    }]);
    setTypedReply(null);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end md:items-end md:justify-end p-0 md:p-4 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop on mobile */}
          <div
            className="absolute inset-0 bg-black/30 md:bg-black/10 pointer-events-auto"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            className="relative pointer-events-auto w-full md:w-[420px] md:max-w-[calc(100vw-2rem)]"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <Card className="rounded-t-2xl md:rounded-2xl shadow-2xl border-2 border-emerald-200 dark:border-emerald-900 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
                    🧑‍🏫
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">Coach Quark</p>
                    <p className="text-[10px] opacity-90 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> AI Math Tutor
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  aria-label="Close tutor"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="h-[340px] md:h-[400px] p-3" ref={scrollRef as never}>
                <div className="space-y-3">
                  {messages.map((m, i) => (
                    <MessageBubble key={i} message={m} />
                  ))}
                  {typedReply !== null && (
                    <MessageBubble
                      message={{ role: "assistant", content: typedReply, timestamp: new Date().toISOString() }}
                      typing
                    />
                  )}
                  {loading && typedReply === null && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pl-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Coach Quark is thinking...
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Suggested actions */}
              {suggestedActions && suggestedActions.length > 0 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                  {suggestedActions.map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => send(a.action)}
                      className="text-xs px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick prompts (shown only at start) */}
              {messages.length <= 1 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/70 transition flex items-center gap-1"
                    >
                      <Lightbulb className="w-3 h-3 text-amber-500" /> {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="border-t p-2 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) send(input);
                  }}
                  placeholder="Ask Coach Quark..."
                  disabled={loading}
                  aria-label="Message to tutor"
                />
                <Button
                  size="icon"
                  onClick={() => send(input)}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>

              {/* Footer */}
              <div className="bg-muted/30 px-3 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> Encouraging • Patient • Safe
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMessages([{
                      role: "assistant",
                      content: "Fresh start! What would you like to work on?",
                      timestamp: new Date().toISOString(),
                    }]);
                    setSessionId(undefined);
                    setSuggestedActions([]);
                  }}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Message Bubble
// ============================================================
function MessageBubble({ message, typing }: { message: TutorMessage; typing?: boolean }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-sm mr-2 flex-shrink-0">
          🧑‍🏫
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
          isUser
            ? "bg-emerald-500 text-white rounded-br-sm"
            : "bg-muted rounded-bl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
          {typing && <span className="inline-block w-1.5 h-3 bg-current ml-0.5 animate-pulse" />}
        </p>
      </div>
    </motion.div>
  );
}

export default TutorPanel;
