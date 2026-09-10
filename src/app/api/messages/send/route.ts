import { pushStickerMessage, pushTextMessage } from "@/lib/line";
import { addMessage } from "@/lib/kv";

type SendBody =
  | { userId: string; kind: "text"; text: string }
  | { userId: string; kind: "sticker"; packageId: string; stickerId: string };

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<SendBody>;
  const { userId, kind } = body;

  if (!userId || !kind) {
    return Response.json({ error: "userId and kind are required" }, { status: 400 });
  }

  const timestamp = Date.now();

  if (kind === "text") {
    const { text } = body as { text?: string };
    if (!text) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }
    await pushTextMessage(userId, text);
    await addMessage({ id: `out-${timestamp}`, userId, direction: "out", timestamp, kind: "text", text });
  } else if (kind === "sticker") {
    const { packageId, stickerId } = body as { packageId?: string; stickerId?: string };
    if (!packageId || !stickerId) {
      return Response.json({ error: "packageId and stickerId are required" }, { status: 400 });
    }
    await pushStickerMessage(userId, packageId, stickerId);
    await addMessage({
      id: `out-${timestamp}`,
      userId,
      direction: "out",
      timestamp,
      kind: "sticker",
      packageId,
      stickerId,
    });
  } else {
    return Response.json({ error: "unsupported kind" }, { status: 400 });
  }

  return Response.json({ ok: true });
}
