export type ChatMessage = {
  id: string;
  userId: string;
  text: string;
  direction: "in" | "out";
  timestamp: number;
};

export type ChatUser = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  lastMessageAt: number;
};
