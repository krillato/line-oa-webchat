import type { ChatUser } from "@/lib/types";

export default function UserList({
  users,
  selectedUserId,
  onSelect,
}: {
  users: ChatUser[];
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="p-4 text-sm text-zinc-500">
        ยังไม่มีข้อความเข้ามา — ลองทักจาก LINE OA ดู
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800">
      {users.map((user) => (
        <li key={user.userId}>
          <button
            onClick={() => onSelect(user.userId)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800 ${
              selectedUserId === user.userId ? "bg-zinc-800" : ""
            }`}
          >
            {user.pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.pictureUrl}
                alt={user.displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-200">
                {user.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="truncate text-sm font-medium text-zinc-100">
              {user.displayName}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
