import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { db, investorAuthChallenges, investorUsers, investorSessions } from "@workspace/db";
import {
  assertDevelopmentCodeDelivery,
  createInvestorSession,
  genericRecoveryMessage,
  hashPassword,
  issueChallenge,
  issuePasswordResetChallenge,
  normalizeEmail,
  publicInvestorUser,
  revokeSessionFromAuthorization,
  verifyChallenge,
  verifyPassword,
} from "../lib/investor-auth";

const router: IRouter = Router();
const rateWindows = new Map<string, { startedAt: number; count: number }>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function bodyOf(req: Request): Record<string, unknown> {
  return isRecord(req.body) ? req.body : {};
}

function validationError(res: Response, message: string): void {
  res.status(422).json({ message });
}

function rateLimitAuth(req: Request, res: Response, next: NextFunction): void {
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
  if (window.count > 30) {
    res.status(429).json({ message: "Too many authentication requests. Try again shortly." });
    return;
  }
  next();
}

router.use(rateLimitAuth);

router.post("/auth/register", async (req, res) => {
  const body = bodyOf(req);
  const name = stringValue(body.name);
  const email = normalizeEmail(stringValue(body.email));
  const phone = stringValue(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirmation = typeof body.password_confirmation === "string" ? body.password_confirmation : "";
  const accountType = stringValue(body.account_type);

  if (name.length < 2 || name.length > 120) return validationError(res, "Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return validationError(res, "Enter a valid email address.");
  if (phone.length < 7 || phone.length > 32) return validationError(res, "Enter a valid mobile number.");
  if (password.length < 8 || password.length > 128) return validationError(res, "Password must be between 8 and 128 characters.");
  if (password !== passwordConfirmation) return validationError(res, "The password and confirmation do not match.");
  if (accountType !== "investor") return validationError(res, "Only investor accounts can be created here.");

  try {
    assertDevelopmentCodeDelivery();
    const [existing] = await db.select({ id: investorUsers.id }).from(investorUsers)
      .where(eq(investorUsers.email, email)).limit(1);
    if (existing) return validationError(res, "An account with this email already exists.");

    const id = randomUUID();
    const [user] = await db.insert(investorUsers).values({
      id,
      name,
      email,
      phone,
      accountType: "investor",
      passwordHash: await hashPassword(password),
    }).returning();
    if (!user) throw new Error("The account could not be created.");
    await issueChallenge(user.id, user.email, "email_verification");
    res.status(200).json({
      success: true,
      requires_verification: true,
      message: "Check the API Server workflow logs for the development verification code.",
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Account creation failed.";
    res.status(detail.includes("Email code delivery") ? 503 : 500).json({ message: detail });
  }
});

router.post("/auth/mobile/login", async (req, res) => {
  const body = bodyOf(req);
  const email = normalizeEmail(stringValue(body.email));
  const password = typeof body.password === "string" ? body.password : "";
  const deviceName = stringValue(body.device_name).slice(0, 80) || "og_investor_mobile";
  if (!email || !password) return validationError(res, "Enter your email address and password.");

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.email, email)).limit(1);
    if (!user) {
      await hashPassword(password);
      res.status(401).json({ message: "The email or password is incorrect." });
      return;
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ message: "The email or password is incorrect." });
      return;
    }
    if (!user.emailVerifiedAt) {
      res.status(403).json({
        requires_verification: true,
        message: "Verify your email address before signing in.",
      });
      return;
    }

    const token = await createInvestorSession(user.id, deviceName);
    res.json({ token, user: publicInvestorUser(user) });
  } catch {
    res.status(500).json({ message: "Sign-in could not be completed. Try again." });
  }
});

router.post("/auth/mobile/verify-email", async (req, res) => {
  const body = bodyOf(req);
  const email = normalizeEmail(stringValue(body.email));
  const code = stringValue(body.code);
  const deviceName = stringValue(body.device_name).slice(0, 80) || "og_investor_mobile";
  if (!email || !/^\d{6}$/.test(code)) return validationError(res, "Enter the six-digit verification code.");

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.email, email)).limit(1);
    if (!user || user.emailVerifiedAt) return validationError(res, "The verification code is invalid or expired.");
    if (!(await verifyChallenge(user.id, "email_verification", code))) {
      return validationError(res, "The verification code is invalid or expired.");
    }

    const [verifiedUser] = await db.update(investorUsers)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(investorUsers.id, user.id))
      .returning();
    if (!verifiedUser) throw new Error("Email verification failed.");
    const token = await createInvestorSession(verifiedUser.id, deviceName);
    res.json({ token, user: publicInvestorUser(verifiedUser) });
  } catch {
    res.status(500).json({ message: "Email verification could not be completed. Try again." });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  const email = normalizeEmail(stringValue(bodyOf(req).email));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return validationError(res, "Enter a valid email address.");

  try {
    assertDevelopmentCodeDelivery();
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.email, email)).limit(1);
    if (user) await issuePasswordResetChallenge(user);
    res.json({ success: true, message: genericRecoveryMessage() });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Password recovery is unavailable.";
    res.status(detail.includes("Email code delivery") ? 503 : 500).json({ message: detail });
  }
});

router.post("/auth/verify-reset-otp", async (req, res) => {
  const body = bodyOf(req);
  const email = normalizeEmail(stringValue(body.email));
  const code = stringValue(body.code);
  if (!email || !/^\d{6}$/.test(code)) return validationError(res, "Enter the six-digit reset code.");

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.email, email)).limit(1);
    if (!user || !(await verifyChallenge(user.id, "password_reset", code))) {
      return validationError(res, "The reset code is invalid or expired.");
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "The reset code could not be verified. Try again." });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  const body = bodyOf(req);
  const email = normalizeEmail(stringValue(body.email));
  const password = typeof body.password === "string" ? body.password : "";
  const confirmation = typeof body.password_confirmation === "string" ? body.password_confirmation : "";
  if (password.length < 8 || password.length > 128) return validationError(res, "Password must be between 8 and 128 characters.");
  if (password !== confirmation) return validationError(res, "The password and confirmation do not match.");

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.email, email)).limit(1);
    if (!user) return validationError(res, "The reset request is invalid or expired.");
    const [verifiedChallenge] = await db.select().from(investorAuthChallenges).where(and(
      eq(investorAuthChallenges.userId, user.id),
      eq(investorAuthChallenges.purpose, "password_reset"),
      isNull(investorAuthChallenges.consumedAt),
      isNotNull(investorAuthChallenges.verifiedAt),
      gt(investorAuthChallenges.expiresAt, new Date()),
    )).orderBy(desc(investorAuthChallenges.createdAt)).limit(1);
    if (!verifiedChallenge) {
      return validationError(res, "Verify a current reset code before changing the password.");
    }

    const now = new Date();
    const nextPasswordHash = await hashPassword(password);
    await db.transaction(async tx => {
      await tx.update(investorUsers)
        .set({ passwordHash: nextPasswordHash, updatedAt: now })
        .where(eq(investorUsers.id, user.id));
      await tx.update(investorAuthChallenges)
        .set({ consumedAt: now })
        .where(eq(investorAuthChallenges.id, verifiedChallenge.id));
      await tx.update(investorSessions)
        .set({ revokedAt: now })
        .where(and(eq(investorSessions.userId, user.id), isNull(investorSessions.revokedAt)));
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "The password could not be updated. Try again." });
  }
});

router.post("/auth/mobile/2fa/verify", (_req, res) => {
  res.status(501).json({ message: "Two-factor authentication is not enabled for this auth service." });
});

router.post("/auth/mobile/logout", async (req, res) => {
  try {
    await revokeSessionFromAuthorization(req.header("authorization"));
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Sign-out could not be completed. Try again." });
  }
});

export default router;