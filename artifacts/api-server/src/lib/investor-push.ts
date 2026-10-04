import { and, eq, gt, isNull } from "drizzle-orm";
import { db, investorPushTokens, investorSessions } from "@workspace/db";
import { logger } from "./logger";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_BATCH_SIZE = 100;
const EXPO_PUSH_PAYLOAD_LIMIT_BYTES = 3_900;

export type InvestorPushMessage = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type ExpoTicket =
  | { status: "ok"; id?: string }
  | { status: "error"; message?: string; details?: { error?: string } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function sendExpoBatch(
  messages: Array<Record<string, unknown>>,
): Promise<ExpoTicket[]> {
  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(10_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error(`Expo Push Service returned HTTP ${response.status}.`);
  }
  const tickets: ExpoTicket[] = [];
  for (const ticket of payload.data) {
    if (!isRecord(ticket) || (ticket.status !== "ok" && ticket.status !== "error")) {
      throw new Error("Expo Push Service returned an invalid ticket.");
    }
    const details = isRecord(ticket.details) && typeof ticket.details.error === "string"
      ? { error: ticket.details.error }
      : undefined;
    tickets.push({
      status: ticket.status,
      ...(typeof ticket.id === "string" ? { id: ticket.id } : {}),
      ...(typeof ticket.message === "string" ? { message: ticket.message } : {}),
      ...(details ? { details } : {}),
    });
  }
  return tickets;
}

async function revokeInvalidToken(token: string): Promise<void> {
  const now = new Date();
  await db.update(investorPushTokens)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(
      eq(investorPushTokens.expoPushToken, token),
      isNull(investorPushTokens.revokedAt),
    ));
}

/**
 * Sends a business-event notification to the investor's active mobile sessions.
 * Call this from a real server-side event handler; the push is not persisted as
 * an in-app notification by this transport helper.
 */
export async function sendInvestorPush(
  userId: string,
  message: InvestorPushMessage,
): Promise<number> {
  if (!userId) throw new Error("An investor user id is required.");
  if (!message.title.trim() || !message.body.trim()) {
    throw new Error("Push notifications require a title and body.");
  }
  if (message.title.length > 200 || message.body.length > 1_500) {
    throw new Error("The push title or body is too long.");
  }

  const data = message.data ?? {};
  const payloadBytes = new TextEncoder().encode(JSON.stringify({
    title: message.title,
    body: message.body,
    data,
  })).length;
  if (payloadBytes > EXPO_PUSH_PAYLOAD_LIMIT_BYTES) {
    throw new Error("The push payload exceeds the supported size.");
  }

  const now = new Date();
  const devices = await db.select({
    token: investorPushTokens.expoPushToken,
  }).from(investorPushTokens)
    .innerJoin(investorSessions, eq(investorPushTokens.sessionId, investorSessions.id))
    .where(and(
      eq(investorPushTokens.userId, userId),
      eq(investorSessions.userId, userId),
      isNull(investorPushTokens.revokedAt),
      isNull(investorSessions.revokedAt),
      gt(investorSessions.expiresAt, now),
    ));

  let accepted = 0;
  for (let offset = 0; offset < devices.length; offset += EXPO_PUSH_BATCH_SIZE) {
    const batch = devices.slice(offset, offset + EXPO_PUSH_BATCH_SIZE);
    const messages = batch.map(device => ({
      to: device.token,
      sound: "default",
      title: message.title,
      body: message.body,
      data,
    }));
    const tickets = await sendExpoBatch(messages);
    if (tickets.length !== batch.length) {
      throw new Error("Expo Push Service returned an unexpected number of tickets.");
    }

    for (const [index, ticket] of tickets.entries()) {
      if (ticket.status === "ok") {
        accepted += 1;
      } else if (ticket.details?.error === "DeviceNotRegistered") {
        await revokeInvalidToken(batch[index]!.token);
      } else {
        logger.warn(
          { userId, error: ticket.details?.error ?? "ExpoPushTicketError" },
          "Expo push notification was rejected",
        );
      }
    }
  }
  return accepted;
}