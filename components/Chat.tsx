"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };
    setMessages((m) => [...m, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, newMessage].map(({ role, content }) => ({ role, content })) }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };
      setMessages((m) => [...m, assistant]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistant = { ...assistant, content: assistant.content + chunk };
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = assistant;
          return copy;
        });
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-gray-500">
            Ask about pricing, refunds, shipping, feature usage, or troubleshooting.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start") }>
            <div className={clsx(
              "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
              m.role === "user" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-900"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 border-t p-3">
        <input
          className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Type your question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className={clsx(
            "rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white",
            loading && "opacity-70"
          )}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
}
