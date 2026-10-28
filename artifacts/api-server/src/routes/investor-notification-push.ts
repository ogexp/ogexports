import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import { ReceiveInternalInvestorNotificationPushBody } from "@workspace/api-zod";
import { db, investorPushEvents, investorUsers } from "@workspace/db";
import { normalizeEmail } from "../lib/investor-auth";
import { sendInvestorPush } from "../lib/investor-push";

const router: IRouter = Router();
const SIGNING_CONTEXT = "ogexports:investor-notification-push:v1";
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;
type RequestWithRawBody = Request & { rawJsonBody?: Buffer };

function validSignature(timestamp: string, signature: string, rawBody: Buffer | undefined, secret: string | undefined) {
  if (!rawBody || !secret || secret.length < 32) return false;
  const issuedAt = Number(timestamp);
  if (!Number.isSafeInteger(issuedAt) || Math.abs(Date.now() / 1000 - issuedAt) > MAX_CLOCK_SKEW_SECONDS) return false;
  const provided = /^sha256=([a-f0-9]{64})$/.exec(signature)?.[1];
  if (!provided) return false;
  const key = createHmac("sha256", secret).update(SIGNING_CONTEXT).digest();
  const expected = createHmac("sha256", key).update(`${timestamp}\n`).update(rawBody).digest();
  const actual = Buffer.from(provided, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

router.post("/internal/investor-notification", async (req, res): Promise<void> => {
  const timestamp = req.get("X-OG-Notification-Timestamp") ?? "";
  const signature = req.get("X-OG-Notification-Signature") ?? "";
  if (!validSignature(timestamp, signature, (req as RequestWithRawBody).rawJsonBody, process.env.SESSION_SECRET)) {
    res.status(401).json({ message: "A valid, current notification signature is required." });
    return;
  }

  const parsed = ReceiveInternalInvestorNotificationPushBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "The notification event is invalid." });
    return;
  }
  const event = parsed.data;
  await db.delete(investorPushEvents).where(lt(investorPushEvents.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)));
  const [inserted] = await db.insert(investorPushEvents)
    .values({ eventId: event.event_id, status: "processing" })
    .onConflictDoNothing()
    .returning({ eventId: investorPushEvents.eventId });

  if (!inserted) {
    const [existing] = await db.select({
      status: investorPushEvents.status,
      acceptedDevices: investorPushEvents.acceptedDevices,
    }).from(investorPushEvents).where(eq(investorPushEvents.eventId, event.event_id)).limit(1);
    if (!existing) {
      res.status(503).json({ message: "Notification event status could not be read." });
      return;
    }
    if (existing.status === "sent") {
      res.json({ duplicate: true, accepted_devices: existing.acceptedDevices });
      return;
    }
    if (existing.status === "processing") {
      res.status(202).json({ duplicate: true, status: "processing" });
      return;
    }
    const [claimed] = await db.update(investorPushEvents)
      .set({ status: "processing", updatedAt: new Date() })
      .where(and(eq(investorPushEvents.eventId, event.event_id), eq(investorPushEvents.status, "failed")))
      .returning({ eventId: investorPushEvents.eventId });
    if (!claimed) {
      res.status(202).json({ duplicate: true, status: "processing" });
      return;
    }
  }

  try {
    const email = normalizeEmail(event.investor_email);
    const [investor] = await db.select({ id: investorUsers.id })
      .from(investorUsers).where(eq(investorUsers.email, email)).limit(1);
    const acceptedDevices = investor
      ? await sendInvestorPush(investor.id, {
        title: event.title,
        body: event.body,
        data: {
          type: event.type,
          notification_id: event.notification_id,
          href: event.href,
        },
      })
      : 0;

    await db.update(investorPushEvents)
      .set({ status: "sent", acceptedDevices, updatedAt: new Date() })
      .where(eq(investorPushEvents.eventId, event.event_id));
    res.json({ duplicate: false, accepted_devices: acceptedDevices });
  } catch (error) {
    await db.update(investorPushEvents)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(investorPushEvents.eventId, event.event_id));
    req.log.error({ err: error, eventId: event.event_id }, "Investor notification push delivery failed.");
    res.status(502).json({ message: "Notification push delivery failed." });
  }
});

export default router;
