import { pushTextMessage } from "@/lib/line";
import { addMessage } from "@/lib/kv";

export async function POST(req: Request) {
  const { userId, text } = (await req.json()) as { userId?: string; text?: string };

  if (!userId || !text) {
    return Response.json({ error: "userId and text are required" }, { status: 400 });
  }

  await pushTextMessage(userId, text);

  const timestamp = Date.now();
  await addMessage({
    id: `out-${timestamp}`,
    userId,
    text,
    direction: "out",
    timestamp,
  });

  return Response.json({ ok: true });
}
