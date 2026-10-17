import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const financeWorkspaces = pgTable("finance_workspaces", {
  userId: text("user_id").primaryKey(),
  state: jsonb("state").notNull().$type<Record<string, unknown>>(),
  revision: integer("revision").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFinanceWorkspaceSchema = createInsertSchema(financeWorkspaces).omit({
  updatedAt: true,
});

export type FinanceWorkspaceRow = typeof financeWorkspaces.$inferSelect;
export type NewFinanceWorkspaceRow = typeof financeWorkspaces.$inferInsert;
