import { randomUUID } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  RegisterInvestorPushTokenBody,
  RevokeInvestorPushTokenBody,
} from "@workspace/api-zod";
import { db, investorPushTokens } from "@workspace/db";
import type { InvestorSessionContext } from "../middlewares/investor-session";
import { requireInvestorSession } from "../middlewares/investor-session";

const router: IRouter = Router();
const rateWindows = new Map<string, { startedAt: number; count: number }>();

type AuthenticatedResponse = Response & {
  locals: Response["locals"] & { investorSession: InvestorSessionContext };
};

function rateLimitPushTokenChanges(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
): void {
  const now = Date.now();
  const key = req.ip ?? "unknown";
  let window = rateWindows.get(key);
  if (!window || now - window.startedAt >= 60_000) {
    window = { startedAt: now, count: 0 };
    rateWindows.set(key, window);
  }
  window.count += 1;
  if (rateWindows.size > 5_000) {
    for (const [ip, item] of rateWindows) {
      if (now - item.startedAt >= 60_000) rateWindows.delete(ip);
    }
  }
  if (window.count > 20) {
    res.status(429).json({ message: "Too many push-token changes. Try again shortly." });
    return;
  }
  next();
}

function sessionFrom(res: Response): InvestorSessionContext {
  return (res as AuthenticatedResponse).locals.investorSession;
}

router.use("/investor/push-tokens", rateLimitPushTokenChanges, requireInvestorSession);

router.post("/investor/push-tokens/register", async (req, res) => {
  const parsed = RegisterInvestorPushTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Enter a valid Expo push token and device platform." });
    return;
  }
  const session = sessionFrom(res);
  const { expo_push_token: expoPushToken, platform } = parsed.data;
  const now = new Date();

  try {
    await db.transaction(async tx => {
      await tx.update(investorPushTokens)
        .set({ revokedAt: now, updatedAt: now })
        .where(and(
          eq(investorPushTokens.sessionId, session.id),
          isNull(investorPushTokens.revokedAt),
          ne(investorPushTokens.expoPushToken, expoPushToken),
        ));

      await tx.insert(investorPushTokens).values({
        id: randomUUID(),
        userId: session.userId,
        sessionId: session.id,
        expoPushToken,
        platform,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: investorPushTokens.expoPushToken,
        set: {
          userId: session.userId,
          sessionId: session.id,
          platform,
          revokedAt: null,
          updatedAt: now,
        },
      });
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Push notifications could not be enabled." });
  }
});

router.post("/investor/push-tokens/revoke", async (req, res) => {
  const parsed = RevokeInvestorPushTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Enter a valid Expo push token." });
    return;
  }
  const session = sessionFrom(res);
  try {
    await db.update(investorPushTokens)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(investorPushTokens.userId, session.userId),
        eq(investorPushTokens.sessionId, session.id),
        eq(investorPushTokens.expoPushToken, parsed.data.expo_push_token),
        isNull(investorPushTokens.revokedAt),
      ));
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Push notifications could not be disabled." });
  }
});

export default router;