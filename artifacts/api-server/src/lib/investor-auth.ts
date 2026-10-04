import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import {
  db,
  investorAuthChallenges,
  investorSessions,
  investorUsers,
} from "@workspace/db";
import { logger } from "./logger";

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

export type ChallengePurpose = "email_verification" | "password_reset";
export type InvestorUser = typeof investorUsers.$inferSelect;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

export function assertDevelopmentCodeDelivery(): void {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Email code delivery is not configured for this server.");
  }
}

export async function issueChallenge(
  userId: string,
  email: string,
  purpose: ChallengePurpose,
): Promise<void> {
  assertDevelopmentCodeDelivery();
  const code = String(randomInt(100_000, 1_000_000));
  const now = new Date();
  await db.delete(investorAuthChallenges).where(and(
    eq(investorAuthChallenges.userId, userId),
    eq(investorAuthChallenges.purpose, purpose),
    isNull(investorAuthChallenges.consumedAt),
  ));
  await db.insert(investorAuthChallenges).values({
    id: randomBytes(16).toString("hex"),
    userId,
    purpose,
    codeHash: challengeDigest(userId, purpose, code),
    attempts: 0,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
  });
  logger.info(
    { recipient: maskEmail(email), purpose, code },
    "Development-only investor verification code",
  );
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
      .where(eq(investorAuthChallenges.id, challenge.id));
    return false;
  }

  await db.update(investorAuthChallenges)
    .set({
      verifiedAt: now,
      consumedAt: purpose === "email_verification" ? now : null,
    })
    .where(eq(investorAuthChallenges.id, challenge.id));
  return true;
}

export function publicInvestorUser(user: InvestorUser): Record<string, unknown> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    account_type: user.accountType,
    email_verified_at: user.emailVerifiedAt?.toISOString() ?? null,
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
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  });
  return token;
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
  return "If the account exists, a password reset code has been created.";
}