import { getMessages } from "@/lib/kv";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const messages = await getMessages(userId);
  return Response.json(messages);
}
