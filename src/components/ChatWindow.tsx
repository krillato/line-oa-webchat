"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { STICKER_PICKS, stickerThumbnailUrl } from "@/lib/stickers";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({
  userId,
  displayName,
}: {
  userId: string;
  displayName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/users/${userId}/messages`);
      if (!res.ok || cancelled) return;
      const data: ChatMessage[] = await res.json();
      setMessages(data);
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setDraft("");
    try {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kind: "text", text }),
      });
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, userId, direction: "out", timestamp: Date.now(), kind: "text", text },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleSendSticker(packageId: string, stickerId: string) {
    if (sending) return;
    setSending(true);
    setShowStickers(false);
    try {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kind: "sticker", packageId, stickerId }),
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          userId,
          direction: "out",
          timestamp: Date.now(),
          kind: "sticker",
          packageId,
          stickerId,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">{displayName}</h2>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>

      {showStickers && (
        <div className="grid grid-cols-8 gap-2 border-t border-zinc-800 p-3">
          {STICKER_PICKS.map((s) => (
            <button
              key={s.stickerId}
              onClick={() => handleSendSticker(s.packageId, s.stickerId)}
              disabled={sending}
              className="rounded-lg p-1 hover:bg-zinc-800 disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stickerThumbnailUrl(s.stickerId)} alt="sticker" className="h-10 w-10 object-contain" />
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-t border-zinc-800 p-3">
        <button
          onClick={() => setShowStickers((v) => !v)}
          className={`rounded-full px-3 py-2 text-lg ${showStickers ? "bg-zinc-700" : "hover:bg-zinc-800"}`}
          title="สติ๊กเกอร์"
        >
          😊
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          ส่ง
        </button>
      </div>
    </div>
  );
}
