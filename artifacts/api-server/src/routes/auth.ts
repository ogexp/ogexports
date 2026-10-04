import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNotNull, isNull, ne } from "drizzle-orm";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import {
  db,
  investorAuthChallenges,
  investorPushTokens,
  investorSessions,
  investorUsers,
} from "@workspace/db";
import { requireInvestorSession, type InvestorSessionContext } from "../middlewares/investor-session";
import {
  AuthEmailDeliveryError,
  ChallengeCooldownError,
  assertEmailDeliveryConfigured,
  createInvestorSession,
  genericRecoveryMessage,
  hashPassword,
  issueChallenge,
  issuePasswordResetChallenge,
  normalizeEmail,
  normalizeMobile,
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

function authError(res: Response, error: unknown, fallback: string): void {
  if (error instanceof ChallengeCooldownError) {
    res.status(429).json({ message: "A code was sent recently. Wait a minute before requesting another." });
    return;
  }
  if (error instanceof AuthEmailDeliveryError) {
    res.status(503).json({ message: "Email delivery is temporarily unavailable. Try again shortly." });
    return;
  }
  res.status(500).json({ message: fallback });
}

function validEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authenticatedSession(res: Response): InvestorSessionContext {
  return res.locals.investorSession as InvestorSessionContext;
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

router.post(["/auth/register", "/auth/registers/pre"], async (req, res) => {
  const body = bodyOf(req);
  const name = stringValue(body.name);
  const email = normalizeEmail(stringValue(body.email));
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirmation = typeof body.password_confirmation === "string" ? body.password_confirmation : "";
  const accountType = stringValue(body.account_type);

  if (name.length < 2 || name.length > 120) return validationError(res, "Enter your full name.");
  if (!validEmail(email)) return validationError(res, "Enter a valid email address.");
  if (password.length < 8 || password.length > 128) return validationError(res, "Password must be between 8 and 128 characters.");
  if (password !== passwordConfirmation) return validationError(res, "The password and confirmation do not match.");
  if (accountType !== "investor") return validationError(res, "Only investor accounts can be created here.");

  try {
    assertEmailDeliveryConfigured();
    const [existingEmail] = await db.select({ id: investorUsers.id }).from(investorUsers)
      .where(eq(investorUsers.email, email)).limit(1);
    if (existingEmail) return validationError(res, "An account with this email already exists.");

    const [user] = await db.insert(investorUsers).values({
      id: randomUUID(),
      name,
      email,
      accountType: "investor",
      passwordHash: await hashPassword(password),
    }).returning();
    if (!user) throw new Error("The account could not be created.");

    try {
      await issueChallenge(user.id, user.email, "email_verification");
    } catch (error) {
      if (error instanceof AuthEmailDeliveryError) {
        res.status(503).json({
          message: "Your account was created, but its verification email could not be sent. Try requesting a new code.",
          requires_email_verification: true,
          email: user.email,
        });
        return;
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      requires_email_verification: true,
      email: user.email,
      message: "Check your email for a six-digit verification code.",
    });
  } catch (error) {
    authError(res, error, "Account creation could not be completed. Try again.");
  }
});

router.post("/auth/mobile/login", async (req, res) => {
  const body = bodyOf(req);
  const email = normalizeEmail(stringValue(body.email));
  const password = typeof body.password === "string" ? body.password : "";
  const deviceName = stringValue(body.device_name).slice(0, 80) || "OG Exports mobile";
  if (!validEmail(email) || !password || password.length > 128) {
    return validationError(res, "Enter a valid email address and password.");
  }

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
        message: "Verify your email address before signing in.",
        requires_email_verification: true,
        email: user.email,
      });
      return;
    }
    if (user.emailTwoFactorEnabled) {
      await issueChallenge(user.id, user.email, "two_factor_login");
      res.json({
        requires_2fa: true,
        email: user.email,
        message: "A sign-in code was sent to your email address.",
      });
      return;
    }

    const token = await createInvestorSession(user.id, deviceName);
    res.json({ token, user: publicInvestorUser(user) });
  } catch (error) {
    authError(res, error, "Sign-in could not be completed. Try again.");
  }
});

router.post("/auth/mobile/verify-email", async (req, res) => {
  const body = bodyOf(req);
  const email = normalizeEmail(stringValue(body.email));
  const code = stringValue(body.code);
  const deviceName = stringValue(body.device_name).slice(0, 80) || "OG Exports mobile";
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return validationError(res, "Enter the six-digit code sent to your email.");
  }

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
  } catch (error) {
    authError(res, error, "Email verification could not be completed. Try again.");
  }
});

router.post("/auth/mobile/resend-verification", async (req, res) => {
  const email = normalizeEmail(stringValue(bodyOf(req).email));
  if (!validEmail(email)) return validationError(res, "Enter a valid email address.");

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.email, email)).limit(1);
    if (!user || user.emailVerifiedAt) {
      res.json({ success: true, message: "If the account needs verification, a code has been sent." });
      return;
    }
    try {
      await issueChallenge(user.id, user.email, "email_verification");
    } catch (error) {
      if (error instanceof ChallengeCooldownError) {
        res.json({ success: true, message: "If the account needs verification, a code has been sent." });
        return;
      }
      throw error;
    }
    res.json({ success: true, message: "A new verification code has been sent." });
  } catch (error) {
    authError(res, error, "A verification email could not be sent. Try again.");
  }
});

router.post("/auth/mobile/2fa/verify", async (req, res) => {
  const body = bodyOf(req);
  const email = normalizeEmail(stringValue(body.email));
  const code = stringValue(body.code);
  const deviceName = stringValue(body.device_name).slice(0, 80) || "OG Exports mobile";
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return validationError(res, "Enter the six-digit sign-in code sent to your email.");
  }

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.email, email)).limit(1);
    if (!user || !user.emailVerifiedAt || !user.emailTwoFactorEnabled) {
      return validationError(res, "The sign-in code is invalid or expired.");
    }
    if (!(await verifyChallenge(user.id, "two_factor_login", code))) {
      return validationError(res, "The sign-in code is invalid or expired.");
    }
    const token = await createInvestorSession(user.id, deviceName);
    res.json({ token, user: publicInvestorUser(user) });
  } catch (error) {
    authError(res, error, "Two-factor sign-in could not be completed. Try again.");
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  const email = normalizeEmail(stringValue(bodyOf(req).email));
  if (!validEmail(email)) return validationError(res, "Enter a valid email address.");

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.email, email)).limit(1);
    if (user) await issuePasswordResetChallenge(user);
    res.json({ success: true, message: genericRecoveryMessage() });
  } catch (error) {
    authError(res, error, "Password recovery is unavailable. Try again.");
  }
});

router.post("/auth/verify-reset-otp", async (req, res) => {
  const body = bodyOf(req);
  const email = normalizeEmail(stringValue(body.email));
  const code = stringValue(body.code);
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return validationError(res, "Enter a valid email address and the six-digit reset code.");
  }

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.email, email)).limit(1);
    if (!user || !(await verifyChallenge(user.id, "password_reset", code))) {
      return validationError(res, "The reset code is invalid or expired.");
    }
    res.json({ success: true });
  } catch (error) {
    authError(res, error, "The reset code could not be verified. Try again.");
  }
});

router.post("/auth/reset-password", async (req, res) => {
  const body = bodyOf(req);
  const email = normalizeEmail(stringValue(body.email));
  const password = typeof body.password === "string" ? body.password : "";
  const confirmation = typeof body.password_confirmation === "string" ? body.password_confirmation : "";
  if (!validEmail(email)) return validationError(res, "Enter the email address used for recovery.");
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
      await tx.update(investorPushTokens)
        .set({ revokedAt: now, updatedAt: now })
        .where(and(eq(investorPushTokens.userId, user.id), isNull(investorPushTokens.revokedAt)));
    });
    res.json({ success: true });
  } catch (error) {
    authError(res, error, "The password could not be updated. Try again.");
  }
});

router.get("/me", requireInvestorSession, async (_req, res) => {
  const current = authenticatedSession(res);
  try {
    const [user] = await db.select().from(investorUsers)
      .where(eq(investorUsers.id, current.userId))
      .limit(1);
    if (!user) {
      res.status(404).json({ message: "The investor account was not found." });
      return;
    }
    res.json({ data: publicInvestorUser(user) });
  } catch {
    res.status(500).json({ message: "Your profile details could not be loaded." });
  }
});

router.put("/me", requireInvestorSession, async (req, res) => {
  const current = authenticatedSession(res);
  const body = bodyOf(req);
  const name = stringValue(body.name);
  const enteredMobile = stringValue(body.mobile ?? body.phone);
  const mobile = enteredMobile ? normalizeMobile(enteredMobile) : null;
  const country = stringValue(body.country);
  if (name.length < 2 || name.length > 120) return validationError(res, "Enter your full name.");
  if (enteredMobile && !mobile) return validationError(res, "Enter a mobile number with its country code, such as +923001234567.");
  if (country.length > 80) return validationError(res, "Country or region must be 80 characters or fewer.");

  try {
    if (mobile) {
      const [existingMobile] = await db.select({ id: investorUsers.id }).from(investorUsers)
        .where(and(eq(investorUsers.mobile, mobile), ne(investorUsers.id, current.userId)))
        .limit(1);
      if (existingMobile) return validationError(res, "That mobile number is already associated with another account.");
    }
    const [user] = await db.update(investorUsers)
      .set({
        name,
        mobile,
        country: country || null,
        phoneVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(investorUsers.id, current.userId))
      .returning();
    if (!user) {
      res.status(404).json({ message: "The investor account was not found." });
      return;
    }
    res.json({ success: true, user: publicInvestorUser(user) });
  } catch {
    res.status(500).json({ message: "Your profile details could not be saved." });
  }
});

router.get("/me/sessions", requireInvestorSession, async (_req, res) => {
  const current = authenticatedSession(res);
  try {
    const now = new Date();
    const sessions = await db.select().from(investorSessions).where(and(
      eq(investorSessions.userId, current.userId),
      isNull(investorSessions.revokedAt),
      gt(investorSessions.expiresAt, now),
    )).orderBy(desc(investorSessions.lastActiveAt));
    res.json({
      data: sessions.map(session => ({
        id: session.id,
        device: session.deviceName,
        created_at: session.createdAt.toISOString(),
        last_activity: session.lastActiveAt.toISOString(),
        expires_at: session.expiresAt.toISOString(),
        is_current: session.id === current.id,
      })),
    });
  } catch {
    res.status(500).json({ message: "Account sessions could not be loaded." });
  }
});

router.delete("/me/sessions/others", requireInvestorSession, async (_req, res) => {
  const current = authenticatedSession(res);
  try {
    const now = new Date();
    const revoked = await db.update(investorSessions)
      .set({ revokedAt: now })
      .where(and(
        eq(investorSessions.userId, current.userId),
        ne(investorSessions.id, current.id),
        isNull(investorSessions.revokedAt),
        gt(investorSessions.expiresAt, now),
      ))
      .returning({ id: investorSessions.id });
    res.json({ success: true, revoked_count: revoked.length });
  } catch {
    res.status(500).json({ message: "Other sessions could not be revoked." });
  }
});

router.delete("/me/sessions/:id", requireInvestorSession, async (req, res) => {
  const current = authenticatedSession(res);
  const id = stringValue(req.params.id);
  if (!id || id === current.id) return validationError(res, "Choose another active session to revoke.");

  try {
    const [revoked] = await db.update(investorSessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(investorSessions.id, id),
        eq(investorSessions.userId, current.userId),
        isNull(investorSessions.revokedAt),
      ))
      .returning({ id: investorSessions.id });
    if (!revoked) {
      res.status(404).json({ message: "That active session was not found." });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "The session could not be revoked." });
  }
});

router.get("/me/2fa", requireInvestorSession, async (_req, res) => {
  const current = authenticatedSession(res);
  try {
    const [user] = await db.select({
      enabled: investorUsers.emailTwoFactorEnabled,
      email: investorUsers.email,
    }).from(investorUsers).where(eq(investorUsers.id, current.userId)).limit(1);
    if (!user) {
      res.status(404).json({ message: "The investor account was not found." });
      return;
    }
    res.json({ enabled: user.enabled, email: user.email, method: "email" });
  } catch {
    res.status(500).json({ message: "Two-factor status could not be loaded." });
  }
});

router.post("/me/2fa/enable", requireInvestorSession, async (req, res) => {
  const current = authenticatedSession(res);
  const password = typeof bodyOf(req).password === "string" ? bodyOf(req).password as string : "";
  if (!password) return validationError(res, "Enter your account password to continue.");

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.id, current.userId)).limit(1);
    if (!user) {
      res.status(404).json({ message: "The investor account was not found." });
      return;
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ message: "The account password is incorrect." });
      return;
    }
    if (!user.emailVerifiedAt) {
      res.status(409).json({ message: "Verify your email address before enabling two-factor authentication." });
      return;
    }
    if (user.emailTwoFactorEnabled) {
      res.status(409).json({ message: "Email two-factor authentication is already enabled." });
      return;
    }

    await issueChallenge(user.id, user.email, "two_factor_setup");
    res.json({
      success: true,
      data: { email: user.email },
      message: "A confirmation code was sent to your email address.",
    });
  } catch (error) {
    authError(res, error, "Two-factor setup could not be started. Try again.");
  }
});

router.post("/me/2fa/confirm", requireInvestorSession, async (req, res) => {
  const current = authenticatedSession(res);
  const code = stringValue(bodyOf(req).code);
  if (!/^\d{6}$/.test(code)) return validationError(res, "Enter the six-digit code sent to your email.");

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.id, current.userId)).limit(1);
    if (!user || user.emailTwoFactorEnabled) {
      res.status(409).json({ message: "Two-factor setup is no longer active." });
      return;
    }
    if (!(await verifyChallenge(user.id, "two_factor_setup", code))) {
      return validationError(res, "The confirmation code is invalid or expired.");
    }
    const [updated] = await db.update(investorUsers)
      .set({ emailTwoFactorEnabled: true, updatedAt: new Date() })
      .where(and(eq(investorUsers.id, user.id), eq(investorUsers.emailTwoFactorEnabled, false)))
      .returning({ id: investorUsers.id });
    if (!updated) {
      res.status(409).json({ message: "Two-factor setup is no longer active." });
      return;
    }
    res.json({ success: true, message: "Email two-factor authentication is enabled." });
  } catch (error) {
    authError(res, error, "Two-factor authentication could not be enabled. Try again.");
  }
});

router.post("/me/2fa/disable", requireInvestorSession, async (req, res) => {
  const current = authenticatedSession(res);
  const password = typeof bodyOf(req).password === "string" ? bodyOf(req).password as string : "";
  if (!password) return validationError(res, "Enter your account password to continue.");

  try {
    const [user] = await db.select().from(investorUsers).where(eq(investorUsers.id, current.userId)).limit(1);
    if (!user) {
      res.status(404).json({ message: "The investor account was not found." });
      return;
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ message: "The account password is incorrect." });
      return;
    }
    if (!user.emailTwoFactorEnabled) {
      res.status(409).json({ message: "Email two-factor authentication is already disabled." });
      return;
    }

    const now = new Date();
    await db.transaction(async tx => {
      await tx.update(investorUsers)
        .set({ emailTwoFactorEnabled: false, updatedAt: now })
        .where(eq(investorUsers.id, user.id));
      await tx.update(investorAuthChallenges)
        .set({ consumedAt: now })
        .where(and(
          eq(investorAuthChallenges.userId, user.id),
          eq(investorAuthChallenges.purpose, "two_factor_login"),
          isNull(investorAuthChallenges.consumedAt),
        ));
    });
    res.json({ success: true, message: "Email two-factor authentication is disabled." });
  } catch (error) {
    authError(res, error, "Two-factor authentication could not be disabled. Try again.");
  }
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