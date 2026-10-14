import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import {
  db,
  investorAuthChallenges,
  investorSessions,
  investorUsers,
} from "@workspace/db";
import { logger } from "./logger";

const connectors = new ReplitConnectors();

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

const scrypt = (
  password: string,
  salt: Buffer,
  length: number,
): Promise<Buffer> => new Promise((resolve, reject) => {
  scryptCallback(password, salt, length, (error, derivedKey) => {
    if (error) reject(error);
    else resolve(derivedKey);
  });
});

export type ChallengePurpose =
  | "email_verification"
  | "password_reset"
  | "two_factor_setup"
  | "two_factor_login";
export type InvestorUser = typeof investorUsers.$inferSelect;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeMobile(mobile: string): string {
  const compact = mobile.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : "";
}

export class AuthEmailDeliveryError extends Error {
  constructor() {
    super("Email delivery is unavailable.");
    this.name = "AuthEmailDeliveryError";
  }
}

export class ChallengeCooldownError extends Error {
  constructor() {
    super("Wait before requesting another code.");
    this.name = "ChallengeCooldownError";
  }
}

export function assertEmailDeliveryConfigured(): void {
  if (!process.env.OG_EXPORTS_AUTH_EMAIL_FROM?.trim()) {
    throw new AuthEmailDeliveryError();
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, keyHex, extra] = storedHash.split(":");
  if (!saltHex || !keyHex || extra !== undefined || !/^[a-f0-9]{32}$/.test(saltHex) || !/^[a-f0-9]{128}$/.test(keyHex)) {
    return false;
  }
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

function challengeDigest(userId: string, purpose: ChallengePurpose, code: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for authentication challenges.");
  return createHmac("sha256", secret).update(`${userId}:${purpose}:${code}`).digest("hex");
}

export async function issueChallenge(
  userId: string,
  email: string,
  purpose: ChallengePurpose,
): Promise<void> {
  assertEmailDeliveryConfigured();
  const now = new Date();
  const [recentChallenge] = await db.select({ id: investorAuthChallenges.id })
    .from(investorAuthChallenges)
    .where(and(
      eq(investorAuthChallenges.userId, userId),
      eq(investorAuthChallenges.purpose, purpose),
      gt(investorAuthChallenges.createdAt, new Date(now.getTime() - 60_000)),
      isNull(investorAuthChallenges.consumedAt),
    ))
    .orderBy(desc(investorAuthChallenges.createdAt))
    .limit(1);
  if (recentChallenge) throw new ChallengeCooldownError();

  const code = String(randomInt(100_000, 1_000_000));
  await db.delete(investorAuthChallenges).where(and(
    eq(investorAuthChallenges.userId, userId),
    eq(investorAuthChallenges.purpose, purpose),
    isNull(investorAuthChallenges.consumedAt),
  ));
  const challengeId = randomBytes(16).toString("hex");
  await db.insert(investorAuthChallenges).values({
    id: challengeId,
    userId,
    purpose,
    codeHash: challengeDigest(userId, purpose, code),
    attempts: 0,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
  });

  const copy = {
    email_verification: {
      subject: "Verify your OG Exports investor account",
      heading: "Verify your email address",
      action: "complete your account registration",
    },
    password_reset: {
      subject: "Reset your OG Exports password",
      heading: "Password reset code",
      action: "reset your password",
    },
    two_factor_setup: {
      subject: "Set up sign-in verification for OG Exports",
      heading: "Confirm two-factor authentication",
      action: "enable email two-factor authentication",
    },
    two_factor_login: {
      subject: "Your OG Exports sign-in code",
      heading: "Sign-in verification code",
      action: "sign in to your account",
    },
  }[purpose];
  const safeCode = escapeHtml(code);
  const message = `Hello,\n\nUse the secure code below to ${copy.action} for your OG Exports investor account.\n\n${code}\n\nThis code expires in 10 minutes. Never share it with anyone. If you did not request this code, you can ignore this email.`;
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3f7f5;font-family:Arial,Helvetica,sans-serif;color:#19372f">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(copy.heading)}. Your secure code expires in 10 minutes.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7f5;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e3ebe7;border-radius:16px;overflow:hidden">
          <tr><td style="background:#12392f;padding:25px 32px">
            <div style="font-size:20px;line-height:26px;font-weight:700;letter-spacing:1.2px;color:#ffffff">OG EXPORTS</div>
            <div style="margin-top:5px;font-size:11px;line-height:16px;letter-spacing:1.6px;color:#b8d6c8">INVESTOR ACCOUNT SECURITY</div>
          </td></tr>
          <tr><td style="padding:34px 32px 12px">
            <div style="font-size:24px;line-height:32px;font-weight:700;color:#17352e">${escapeHtml(copy.heading)}</div>
            <p style="margin:16px 0 22px;font-size:15px;line-height:24px;color:#52645d">Hello,</p>
            <p style="margin:0 0 22px;font-size:15px;line-height:24px;color:#52645d">Use this secure, one-time code to ${escapeHtml(copy.action)} for your OG Exports investor account.</p>
            <div style="margin:0 0 14px;padding:19px 12px;text-align:center;background:#f4f8f6;border:1px solid #dce9e2;border-radius:12px">
              <div style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.5px;color:#527064">YOUR VERIFICATION CODE</div>
              <div style="padding-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:42px;font-weight:700;letter-spacing:9px;color:#087f5b">${safeCode}</div>
            </div>
            <p style="margin:0 0 24px;text-align:center;font-size:13px;line-height:20px;color:#687a72">This code expires in <strong style="color:#334b41">10 minutes</strong>.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff8e9;border-left:3px solid #d7a94b;border-radius:4px">
              <tr><td style="padding:13px 15px;font-size:13px;line-height:20px;color:#675633"><strong>Keep your account secure.</strong> Never share this code with anyone. OG Exports will never ask you to disclose it.</td></tr>
            </table>
            <p style="margin:22px 0 0;font-size:13px;line-height:21px;color:#687a72">If you did not request this code, you can safely ignore this email. No sign-in will be completed without it.</p>
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #edf1ee;font-size:11px;line-height:18px;color:#87958e">This is an automated security email from OG Exports. Please do not reply.</td></tr>
        </table>
        <div style="padding:16px 8px 0;font-size:11px;line-height:17px;color:#87958e">© OG Exports · Investor Services</div>
      </td></tr>
    </table>
  </body>
</html>`;

  try {
    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.OG_EXPORTS_AUTH_EMAIL_FROM?.trim(),
        to: [email],
        subject: copy.subject,
        text: message,
        html,
      }),
    });
    if (!response.ok) {
      logger.warn({ purpose, status: response.status }, "Resend rejected an investor authentication email.");
      throw new AuthEmailDeliveryError();
    }
  } catch {
    await db.update(investorAuthChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(investorAuthChallenges.id, challengeId), isNull(investorAuthChallenges.consumedAt)));
    throw new AuthEmailDeliveryError();
  }
}

export async function verifyChallenge(
  userId: string,
  purpose: ChallengePurpose,
  code: string,
): Promise<boolean> {
  const now = new Date();
  const [challenge] = await db.select().from(investorAuthChallenges).where(and(
    eq(investorAuthChallenges.userId, userId),
    eq(investorAuthChallenges.purpose, purpose),
    isNull(investorAuthChallenges.consumedAt),
    gt(investorAuthChallenges.expiresAt, now),
  )).orderBy(desc(investorAuthChallenges.createdAt)).limit(1);
  if (!challenge || challenge.attempts >= 5) return false;

  const expected = Buffer.from(challenge.codeHash, "hex");
  const actual = Buffer.from(challengeDigest(userId, purpose, code), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!matches) {
    await db.update(investorAuthChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(and(
        eq(investorAuthChallenges.id, challenge.id),
        eq(investorAuthChallenges.attempts, challenge.attempts),
        isNull(investorAuthChallenges.consumedAt),
      ));
    return false;
  }

  const [verified] = await db.update(investorAuthChallenges)
    .set({
      verifiedAt: now,
      consumedAt: purpose === "password_reset" ? null : now,
    })
    .where(and(
      eq(investorAuthChallenges.id, challenge.id),
      eq(investorAuthChallenges.attempts, challenge.attempts),
      isNull(investorAuthChallenges.consumedAt),
      gt(investorAuthChallenges.expiresAt, now),
    ))
    .returning({ id: investorAuthChallenges.id });
  return Boolean(verified);
}

export function publicInvestorUser(user: InvestorUser): Record<string, unknown> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    country: user.country,
    account_type: user.accountType,
    email_verified_at: user.emailVerifiedAt?.toISOString() ?? null,
    phone_verified_at: user.phoneVerifiedAt?.toISOString() ?? null,
    email_two_factor_enabled: user.emailTwoFactorEnabled,
  };
}

export async function createInvestorSession(
  userId: string,
  deviceName: string,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.insert(investorSessions).values({
    id: randomBytes(16).toString("hex"),
    userId,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    deviceName,
    lastActiveAt: now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  });
  return token;
}

export async function findInvestorSessionFromAuthorization(
  header: string | undefined,
): Promise<{ id: string; userId: string } | null> {
  const match = /^Bearer\s+([A-Za-z0-9_-]+)$/i.exec(header ?? "");
  if (!match) return null;
  const tokenHash = createHash("sha256").update(match[1]).digest("hex");
  const [session] = await db.select({
    id: investorSessions.id,
    userId: investorSessions.userId,
  }).from(investorSessions).where(and(
    eq(investorSessions.tokenHash, tokenHash),
    isNull(investorSessions.revokedAt),
    gt(investorSessions.expiresAt, new Date()),
  )).limit(1);
  if (session) {
    await db.update(investorSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(investorSessions.id, session.id));
  }
  return session ?? null;
}

export async function revokeSessionFromAuthorization(header: string | undefined): Promise<void> {
  const match = /^Bearer\s+([A-Za-z0-9_-]+)$/i.exec(header ?? "");
  if (!match) return;
  const tokenHash = createHash("sha256").update(match[1]).digest("hex");
  await db.update(investorSessions)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(investorSessions.tokenHash, tokenHash),
      isNull(investorSessions.revokedAt),
    ));
}

export async function issuePasswordResetChallenge(user: InvestorUser): Promise<void> {
  await issueChallenge(user.id, user.email, "password_reset");
}

export function genericRecoveryMessage(): string {
  return "If the account exists, a password reset code has been sent to its email address.";
}