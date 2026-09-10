type ChatMessageBase = {
  id: string;
  userId: string;
  direction: "in" | "out";
  timestamp: number;
};

export type ChatMessage =
  | (ChatMessageBase & { kind: "text"; text: string })
  | (ChatMessageBase & { kind: "sticker"; packageId: string; stickerId: string });

export type ChatUser = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  lastMessageAt: number;
};
