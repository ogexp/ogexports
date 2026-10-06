import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import {
  ReceiveInternalInvestorPayoutProgressBody,
  ReceiveInternalInvestorPayoutProgressHeader,
} from "@workspace/api-zod";
import {
  db,
  investorPushEvents,
  investorUsers,
} from "@workspace/db";
import { normalizeEmail } from "../lib/investor-auth";
import { sendInvestorPush } from "../lib/investor-push";

const router: IRouter = Router();
const SIGNING_CONTEXT = "ogexports:investor-payout-push:v1";
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

type RequestWithRawBody = Request & { rawJsonBody?: Buffer };

function expectedSignature(timestamp: string, rawBody: Buffer, secret: string): Buffer {
  const key = createHmac("sha256", secret).update(SIGNING_CONTEXT).digest();
  return createHmac("sha256", key)
    .update(`${timestamp}\n`)
    .update(rawBody)
    .digest();
}

function validSignature(
  timestamp: string,
  signature: string,
  rawBody: Buffer | undefined,
  secret: string | undefined,
): boolean {
  if (!rawBody || !secret || secret.length < 32) return false;

  const issuedAt = Number(timestamp);
  if (!Number.isSafeInteger(issuedAt) || Math.abs(Date.now() / 1000 - issuedAt) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const provided = /^sha256=([a-f0-9]{64})$/.exec(signature)?.[1];
  if (!provided) return false;

  const expected = expectedSignature(timestamp, rawBody, secret);
  const actual = Buffer.from(provided, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

router.post("/internal/investor-payout-progress", async (req, res): Promise<void> => {
  const headers = ReceiveInternalInvestorPayoutProgressHeader.safeParse({
    "X-OG-Payout-Timestamp": req.get("X-OG-Payout-Timestamp"),
    "X-OG-Payout-Signature": req.get("X-OG-Payout-Signature"),
  });
  const rawBody = (req as RequestWithRawBody).rawJsonBody;

  if (
    !headers.success
    || !validSignature(
      headers.data["X-OG-Payout-Timestamp"],
      headers.data["X-OG-Payout-Signature"],
      rawBody,
      process.env.SESSION_SECRET,
    )
  ) {
    res.status(401).json({ message: "A valid, current payout-event signature is required." });
    return;
  }

  const parsed = ReceiveInternalInvestorPayoutProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "The payout event is invalid." });
    return;
  }

  const event = parsed.data;
  await db.delete(investorPushEvents).where(
    lt(investorPushEvents.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
  );
  const [inserted] = await db.insert(investorPushEvents)
    .values({ eventId: event.event_id, status: "processing" })
    .onConflictDoNothing()
    .returning({ eventId: investorPushEvents.eventId });

  if (!inserted) {
    const [existing] = await db.select({
      status: investorPushEvents.status,
      acceptedDevices: investorPushEvents.acceptedDevices,
    }).from(investorPushEvents)
      .where(eq(investorPushEvents.eventId, event.event_id))
      .limit(1);

    if (!existing) {
      res.status(503).json({ message: "Payout event status could not be read." });
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
      .where(and(
        eq(investorPushEvents.eventId, event.event_id),
        eq(investorPushEvents.status, "failed"),
      ))
      .returning({ eventId: investorPushEvents.eventId });
    if (!claimed) {
      res.status(202).json({ duplicate: true, status: "processing" });
      return;
    }
  }

  try {
    const email = normalizeEmail(event.investor_email);
    const [investor] = await db.select({
      id: investorUsers.id,
    }).from(investorUsers)
      .where(eq(investorUsers.email, email))
      .limit(1);

    if (!investor) {
      req.log.warn({ eventId: event.event_id }, "Payout push has no matching mobile investor account.");
      await db.update(investorPushEvents)
        .set({ status: "sent", acceptedDevices: 0, updatedAt: new Date() })
        .where(eq(investorPushEvents.eventId, event.event_id));
      res.json({ duplicate: false, accepted_devices: 0 });
      return;
    }

    const statusLabel = event.status === "scheduled" ? "Scheduled" : "Processing";
    const plannedDate = event.planned_date?.toISOString().slice(0, 10) ?? null;
    const dateSentence = plannedDate ? ` The planned date is ${plannedDate}.` : "";
    const body = event.status === "scheduled"
      ? `Your payout for investment ${event.investment_reference} is scheduled.${dateSentence} This planned date is not proof that payment has been completed.`
      : `An administrator has marked the payout for investment ${event.investment_reference} as processing.${dateSentence} This update does not confirm that payment has been completed.`;
    const acceptedDevices = await sendInvestorPush(investor.id, {
      title: `Payout update: ${statusLabel}`,
      body,
      data: {
        type: "payout_progress",
        investment_id: event.investment_id,
        payout_status: event.status,
        planned_distribution_date: plannedDate,
        href: `/position/${event.investment_id}`,
      },
    });

    await db.update(investorPushEvents)
      .set({ status: "sent", acceptedDevices, updatedAt: new Date() })
      .where(eq(investorPushEvents.eventId, event.event_id));

    res.json({ duplicate: false, accepted_devices: acceptedDevices });
  } catch (error) {
    await db.update(investorPushEvents)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(investorPushEvents.eventId, event.event_id));
    req.log.error({ err: error, eventId: event.event_id }, "Payout progress push delivery failed.");
    res.status(502).json({ message: "Push delivery failed." });
  }
});

export default router;
