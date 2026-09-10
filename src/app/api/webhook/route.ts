import { webhook } from "@line/bot-sdk";
import { getLineProfile, verifyLineSignature } from "@/lib/line";
import { addMessage, upsertUser } from "@/lib/kv";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyLineSignature(body, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(body) as webhook.CallbackRequest;
  const events = payload.events ?? [];

  await Promise.all(
    events.map(async (event) => {
      if (event.type !== "message") return;
      if (event.source?.type !== "user" || !event.source.userId) return;
      if (event.message.type !== "text" && event.message.type !== "sticker") return;

      const userId = event.source.userId;
      const timestamp = event.timestamp ?? Date.now();

      const profile = await getLineProfile(userId).catch(() => null);
      await upsertUser(userId, profile?.displayName ?? userId, profile?.pictureUrl, timestamp);

      if (event.message.type === "text") {
        await addMessage({
          id: event.message.id,
          userId,
          direction: "in",
          timestamp,
          kind: "text",
          text: event.message.text,
        });
      } else {
        await addMessage({
          id: event.message.id,
          userId,
          direction: "in",
          timestamp,
          kind: "sticker",
          packageId: event.message.packageId,
          stickerId: event.message.stickerId,
        });
      }
    })
  );

  return new Response("OK", { status: 200 });
}
