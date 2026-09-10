# LINE OA Webchat

เว็บแชท (inbox) สำหรับส่ง/รับข้อความกับ LINE Official Account ผ่าน LINE Messaging API — เห็นรายชื่อ user ที่ทักเข้ามา เลือก user เพื่อตอบกลับได้ทีละคน

---

## เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี | เหตุผลที่เลือก |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) + **TypeScript** | ตามโจทย์กำหนด, API routes + frontend อยู่ในโปรเจกต์เดียว deploy ง่ายบน Vercel |
| Styling | **Tailwind CSS v4** | มาตรฐานคู่กับ Next.js, เขียนเร็ว ไม่ต้องแยกไฟล์ CSS |
| Package manager | **pnpm** | ติดตั้งเร็ว ประหยัด disk (hard link) |
| LINE SDK | **@line/bot-sdk** (v11) | official SDK จาก LINE — ใช้ verify webhook signature, เรียก push message, ดึง user profile |
| Data store | **Redis** (ผ่าน `redis` npm package / node-redis) | เก็บรายชื่อ user + ประวัติข้อความ ให้ Vercel serverless function (ซึ่งไม่มี state ถาวรในตัวเอง) อ่าน-เขียนข้ามแต่ละ request ได้ |
| Realtime (ฝั่ง webchat) | **Polling** (fetch ทุก 3 วิ) แทน WebSocket/SSE | Vercel Hobby (free) function มี max duration สั้น ไม่เหมาะกับ connection ค้างนาน ๆ แบบ SSE — polling ใช้งานได้ฟรี ไม่ต้องพึ่ง service เสริม (Pusher/Ably) พอสำหรับ use case นี้ |
| Dev tunnel | **ngrok** | เปิด public HTTPS URL ชั่วคราว ให้ LINE ยิง webhook เข้ามาถึง localhost ตอนพัฒนา/ทดสอบ |
| Deploy | **Vercel** | ตามโจทย์กำหนด |

---

## โครงสร้างโปรเจกต์

```
line-oa-webchat/
├── src/
│   ├── app/
│   │   ├── layout.tsx                          # root layout, metadata
│   │   ├── page.tsx                            # หน้า webchat หลัก (sidebar user list + chat window)
│   │   ├── globals.css                         # dark theme, Tailwind import
│   │   └── api/
│   │       ├── webhook/
│   │       │   └── route.ts                    # POST — รับ event จาก LINE (verify signature, เซฟ user+message)
│   │       ├── messages/
│   │       │   └── send/
│   │       │       └── route.ts                # POST — ส่งข้อความจาก webchat ไปหา LINE user (push message)
│   │       └── users/
│   │           ├── route.ts                    # GET — รายชื่อ user ทั้งหมด (เรียงตามข้อความล่าสุด)
│   │           └── [userId]/
│   │               └── messages/
│   │                   └── route.ts             # GET — ประวัติแชทของ user คนนั้น
│   │
│   ├── components/
│   │   ├── UserList.tsx                        # sidebar รายชื่อ user
│   │   ├── ChatWindow.tsx                       # หน้าต่างแชท (polling + ช่องพิมพ์ส่ง)
│   │   └── MessageBubble.tsx                    # กล่องข้อความแต่ละฝั่ง (เข้า/ออก)
│   │
│   └── lib/
│       ├── line.ts                             # wrapper เรียก LINE Messaging API
│       ├── kv.ts                                # wrapper อ่าน/เขียน Redis
│       └── types.ts                            # ChatMessage, ChatUser types
│
├── public/                                     # static assets (icon ฯลฯ)
├── .env.local.example                          # ตัวอย่างตัวแปร env ที่ต้องตั้ง
├── .env.local                                  # ค่าจริง (ไม่ขึ้น git)
├── package.json
└── README.md
```

**หลักการแบ่งงาน:**
- `app/` = routing + API endpoint เท่านั้น ไม่มี business logic ปนอยู่
- `lib/` = โค้ดที่คุยกับ external service (LINE API, Redis) แยกออกมาต่างหาก
- `components/` = UI ล้วน ๆ คุยกับ backend ผ่าน `fetch` ไปที่ `/api/*` เท่านั้น ไม่เรียก LINE/Redis ตรง ๆ

---

## Flow การทำงาน

### 1) รับข้อความจาก LINE (Inbound)

```
User พิมพ์ใน LINE app
        │
        ▼
LINE server ยิง POST → /api/webhook
        │
        ▼
verifyLineSignature()  ← ตรวจ x-line-signature ด้วย LINE_CHANNEL_SECRET
        │ (ผ่าน)
        ▼
อ่าน event → ถ้าเป็นข้อความ text จาก user:
    - getLineProfile(userId)  → ดึงชื่อ/รูปโปรไฟล์
    - upsertUser()            → บันทึก/อัปเดต user ใน Redis
    - addMessage()             → บันทึกข้อความ (direction: "in") ใน Redis
        │
        ▼
ตอบ LINE server 200 OK
```

### 2) แสดงผลฝั่ง Webchat

```
page.tsx  → poll GET /api/users ทุก 3 วิ → แสดงรายชื่อ user (sidebar)
เลือก user → ChatWindow → poll GET /api/users/[userId]/messages ทุก 3 วิ → แสดงข้อความ
```

### 3) ส่งข้อความจาก Webchat (Outbound)

```
พิมพ์ในช่อง input → กดส่ง
        │
        ▼
POST /api/messages/send  { userId, text }
        │
        ▼
pushTextMessage()  → เรียก LINE push message API ด้วย LINE_CHANNEL_ACCESS_TOKEN
        │
        ▼
addMessage()  → บันทึกข้อความ (direction: "out") ใน Redis
        │
        ▼
ข้อความไปโผล่ในแอป LINE ของ user คนนั้น
```

### โครงสร้างข้อมูลใน Redis

| Key | ชนิด | ใช้เก็บ |
|---|---|---|
| `users` | Sorted Set | รายชื่อ userId ทั้งหมด, score = เวลาข้อความล่าสุด (ใช้เรียงลำดับ sidebar) |
| `user:{userId}` | Hash | `displayName`, `pictureUrl` ของ user คนนั้น |
| `messages:{userId}` | List | ข้อความทั้งหมดของ user คนนั้น (JSON string เรียงตามเวลา) |

---

## การรัน package / คำสั่งที่ใช้บ่อย

```bash
# ติดตั้ง dependencies
pnpm install

# ตั้งค่า environment variables (ครั้งแรกเท่านั้น)
cp .env.local.example .env.local
# แล้วกรอกค่าใน .env.local:
#   LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN  → จาก LINE Developers Console > channel > Messaging API tab
#   REDIS_URL                                        → connection string ของ Redis database

# รัน dev server (port 3100)
pnpm dev

# เปิด public URL ชั่วคราวให้ LINE ยิง webhook เข้ามาถึง local (รันคนละ terminal กับ pnpm dev)
pnpm tunnel
# ได้ URL เช่น https://xxxx.ngrok-free.dev
# เอา https://xxxx.ngrok-free.dev/api/webhook ไปตั้งใน LINE Developers Console > Messaging API > Webhook URL

# เช็ค request ที่ยิงเข้ามาแบบ real-time
# เปิดเบราว์เซอร์ไปที่ http://localhost:4040

# ตรวจโค้ด (type check + lint)
pnpm lint

# build สำหรับ production
pnpm build

# รันเวอร์ชัน production (หลัง build)
pnpm start
```

---

## ขั้นตอนการสร้างโปรเจกต์นี้ (ทำตามลำดับจริง)

### 1. วางแผนโครงสร้าง/เทคโนโลยี
ตกลงสเปค: Next.js App Router + TypeScript, Tailwind CSS, pnpm, Redis สำหรับเก็บข้อมูล (เพราะ Vercel serverless function ไม่มี state ถาวร), ใช้ polling แทน websocket/SSE (ฟรี ไม่ต้องพึ่ง service เสริม เหมาะกับ test/demo)

### 2. สร้าง LINE Official Account + Messaging API Channel
- สร้าง Provider ใน [LINE Developers Console](https://developers.line.biz/console/)
- สร้าง LINE Official Account ผ่าน LINE Official Account Manager (กรอกชื่อบัญชี, อีเมล, ประเภทธุรกิจ) → ได้ Basic ID
- เปิดใช้งาน Messaging API ให้ OA นี้ ผูกกับ Provider ที่สร้างไว้ → ระบบสร้าง Messaging API Channel ให้อัตโนมัติ
- ไปที่แท็บ Messaging API ของ channel → คัดลอก **Channel Secret**, กด Issue เพื่อสร้าง **Channel Access Token (long-lived)**
- ปิด Auto-reply messages / Greeting messages ใน LINE Official Account Manager (กัน noise ตอน demo)

### 3. Scaffold โปรเจกต์ Next.js
```bash
pnpm create next-app@latest line-oa-webchat \
  --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-pnpm
```

### 4. ติดตั้ง dependency สำหรับ LINE + Redis
```bash
pnpm add @line/bot-sdk redis
```
(เริ่มแรกลองใช้ `@upstash/redis` ตาม REST API แต่ Redis instance ที่ใช้จริงให้ connection string แบบ native protocol `redis://...` เลยสลับมาใช้ `redis` (node-redis) แทน)

### 5. เขียน `src/lib/types.ts`
กำหนด type `ChatMessage` (id, userId, text, direction, timestamp) และ `ChatUser` (userId, displayName, pictureUrl, lastMessageAt)

### 6. เขียน `src/lib/line.ts`
wrapper ครอบ `@line/bot-sdk`:
- `verifyLineSignature()` — ตรวจลายเซ็น webhook
- `pushTextMessage()` — ส่งข้อความ (push API)
- `getLineProfile()` — ดึงโปรไฟล์ user

### 7. เขียน `src/lib/kv.ts`
wrapper ครอบ Redis client: `upsertUser()`, `getUsers()`, `addMessage()`, `getMessages()` ใช้ sorted set + hash + list ตามที่อธิบายไว้ด้านบน

### 8. เขียน API routes
`webhook/route.ts`, `messages/send/route.ts`, `users/route.ts`, `users/[userId]/messages/route.ts` — เรียกใช้ฟังก์ชันจาก `lib/line.ts` และ `lib/kv.ts`

### 9. เขียน UI
`UserList.tsx`, `ChatWindow.tsx` (polling + ส่งข้อความ), `MessageBubble.tsx` แล้วประกอบใน `page.tsx` เป็น layout sidebar + chat window

### 10. ตรวจสอบโค้ด
```bash
pnpm build   # type check + compile
pnpm lint    # eslint
```
วนแก้จนไม่มี error/warning

### 11. ตั้งค่า Redis จริง
สร้าง Redis database (Vercel Storage) → คัดลอก connection string → ใส่ใน `.env.local`

### 12. ติดตั้ง ngrok สำหรับทดสอบ webhook บน local
```bash
brew install ngrok
ngrok config add-authtoken <token จาก ngrok.com>
```
เพิ่ม script `dev` (fix port เป็น 3100) และ `tunnel` (`ngrok http 3100`) ใน `package.json` ให้รันง่าย

### 13. ทดสอบ end-to-end จริง
รัน `pnpm dev` + `pnpm tunnel` → เอา ngrok URL ไปตั้งเป็น Webhook URL ใน LINE Console → verify → ทักข้อความจาก LINE app จริง → เช็คว่า user ขึ้นใน webchat → ตอบกลับจาก webchat → เช็คว่า LINE app ได้รับ

### 14. ปรับ UI เป็น dark theme
แก้ `globals.css` ให้ตั้ง `color-scheme: dark` ตรง ๆ (แก้บั๊กที่ browser auto dark-mode ทำให้ตัวหนังสือใน `<input>` มองไม่เห็น) และไล่สี component ทั้งหมดเป็นโทนมืด (`zinc-950` / `zinc-800` + เขียว LINE สำหรับข้อความที่ส่งออก)

### 15. เตรียม deploy
- สร้าง GitHub repository (public) แล้ว push โค้ด
- Import project เข้า Vercel → ตั้ง Environment Variables เดียวกับ `.env.local`
- Deploy → เอา URL production ไปตั้งเป็น Webhook URL แทน ngrok ใน LINE Console (เลิกใช้ ngrok ได้ตั้งแต่จุดนี้)
