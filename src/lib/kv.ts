import { createClient, type RedisClientType } from "redis";
import type { ChatMessage, ChatUser } from "./types";

declare global {
  var __redisClient: RedisClientType | undefined;
}

function getClient(): RedisClientType {
  if (!global.__redisClient) {
    global.__redisClient = createClient({ url: process.env.REDIS_URL });
    global.__redisClient.connect();
  }
  return global.__redisClient;
}

const USERS_KEY = "users";
const userProfileKey = (userId: string) => `user:${userId}`;
const userMessagesKey = (userId: string) => `messages:${userId}`;

export async function upsertUser(
  userId: string,
  displayName: string,
  pictureUrl: string | undefined,
  timestamp: number
) {
  const redis = getClient();
  await redis.hSet(userProfileKey(userId), { displayName, pictureUrl: pictureUrl ?? "" });
  await redis.zAdd(USERS_KEY, { score: timestamp, value: userId });
}

export async function getUsers(): Promise<ChatUser[]> {
  const redis = getClient();
  const userIds = await redis.zRange(USERS_KEY, 0, -1, { REV: true });
  if (userIds.length === 0) return [];

  const profiles = await Promise.all(
    userIds.map((userId) => redis.hGetAll(userProfileKey(userId)))
  );
  const scores = await Promise.all(userIds.map((userId) => redis.zScore(USERS_KEY, userId)));

  return userIds.map((userId, i) => ({
    userId,
    displayName: profiles[i]?.displayName || userId,
    pictureUrl: profiles[i]?.pictureUrl || undefined,
    lastMessageAt: Number(scores[i] ?? 0),
  }));
}

export async function addMessage(message: ChatMessage) {
  const redis = getClient();
  await redis.rPush(userMessagesKey(message.userId), JSON.stringify(message));
  await redis.zAdd(USERS_KEY, { score: message.timestamp, value: message.userId });
}

export async function getMessages(userId: string): Promise<ChatMessage[]> {
  const redis = getClient();
  const raw = await redis.lRange(userMessagesKey(userId), 0, -1);
  return raw.map((item) => JSON.parse(item));
}
