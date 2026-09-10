import { getMessages, getUsers } from "@/lib/kv";

export async function GET() {
  const users = await getUsers();
  const usersWithMessages = await Promise.all(
    users.map(async (user) => ({
      ...user,
      messages: await getMessages(user.userId),
    }))
  );

  return new Response(JSON.stringify(usersWithMessages, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
