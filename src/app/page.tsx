"use client";

import { useEffect, useState } from "react";
import type { ChatUser } from "@/lib/types";
import UserList from "@/components/UserList";
import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/users");
      if (!res.ok || cancelled) return;
      const data: ChatUser[] = await res.json();
      setUsers(data);
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const selectedUser = users.find((u) => u.userId === selectedUserId) ?? null;

  return (
    <div className="flex h-screen bg-zinc-950">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h1 className="text-sm font-semibold text-zinc-100">LINE OA Webchat</h1>
        </div>
        <UserList
          users={users}
          selectedUserId={selectedUserId}
          onSelect={setSelectedUserId}
        />
      </aside>

      <main className="flex-1">
        {selectedUser ? (
          <ChatWindow userId={selectedUser.userId} displayName={selectedUser.displayName} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            เลือก user ทางซ้ายเพื่อเริ่มแชท
          </div>
        )}
      </main>
    </div>
  );
}
