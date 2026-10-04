import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const investorUsers = pgTable("investor_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  accountType: text("account_type").notNull().default("investor"),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const investorSessions = pgTable("investor_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => investorUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  deviceName: text("device_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, table => [index("investor_sessions_user_id_idx").on(table.userId)]);

export const investorAuthChallenges = pgTable("investor_auth_challenges", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => investorUsers.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
}, table => [index("investor_auth_challenges_user_purpose_idx").on(table.userId, table.purpose)]);