import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const investorPushEvents = pgTable(
  "investor_push_events",
  {
    eventId: text("event_id").primaryKey(),
    status: text("status").notNull(),
    acceptedDevices: integer("accepted_devices").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index("investor_push_events_created_at_idx").on(table.createdAt)],
);

export type InvestorPushEvent = typeof investorPushEvents.$inferSelect;
