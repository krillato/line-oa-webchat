import { getUsers } from "@/lib/kv";

export async function GET() {
  const users = await getUsers();
  return Response.json(users);
}
