// เซ็ตสติ๊กเกอร์ตัวอย่างจาก LINE's official sticker list (ใช้ยิงผ่าน Messaging API ได้ทุก channel โดยไม่ต้องขอสิทธิ์เพิ่ม)
// ดูรายการเต็ม/สลับชุดอื่นได้ที่ https://developers.line.biz/en/docs/messaging-api/sticker-list/
export const STICKER_PICKS = [
  { packageId: "446", stickerId: "1988" },
  { packageId: "446", stickerId: "1989" },
  { packageId: "446", stickerId: "1990" },
  { packageId: "446", stickerId: "1991" },
  { packageId: "446", stickerId: "1992" },
  { packageId: "446", stickerId: "1993" },
  { packageId: "446", stickerId: "1994" },
  { packageId: "446", stickerId: "1995" },
];

export function stickerThumbnailUrl(stickerId: string) {
  return `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`;
}
