import { createInsertSchema } from "drizzle-zod";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { investorSessions, investorUsers } from "./investor-auth";

export const investorPushTokens = pgTable("investor_push_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => investorUsers.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull().references(() => investorSessions.id, { onDelete: "cascade" }),
  expoPushToken: text("expo_push_token").notNull().unique(),
  platform: text("platform").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, table => [
  index("investor_push_tokens_user_id_idx").on(table.userId),
  index("investor_push_tokens_session_id_idx").on(table.sessionId),
]);

export const insertInvestorPushTokenSchema = createInsertSchema(investorPushTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  revokedAt: true,
});

export type InsertInvestorPushToken = z.infer<typeof insertInvestorPushTokenSchema>;
export type InvestorPushToken = typeof investorPushTokens.$inferSelect;