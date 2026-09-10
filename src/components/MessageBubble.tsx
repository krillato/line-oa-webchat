import type { ChatMessage } from "@/lib/types";
import { stickerThumbnailUrl } from "@/lib/stickers";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isOut = message.direction === "out";

  if (message.kind === "sticker") {
    return (
      <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stickerThumbnailUrl(message.stickerId)}
          alt="sticker"
          className="h-24 w-24 object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
          isOut ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-100"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
