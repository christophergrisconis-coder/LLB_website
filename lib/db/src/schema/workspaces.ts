import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("workspace_users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  name: varchar("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionsTable = pgTable("workspace_sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const workspacesTable = pgTable("workspaces", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  workspaceId: varchar("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  client: varchar("client").notNull(),
  status: varchar("status").notNull().default("Intake"),
  priority: varchar("priority").notNull().default("Normal"),
  nextDeadline: varchar("next_deadline"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
});

export const savedAuthoritiesTable = pgTable("saved_case_authorities", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  authorityId: varchar("authority_id").notNull(),
  title: varchar("title").notNull(),
  citation: varchar("citation").notNull(),
  court: varchar("court").notNull(),
  year: integer("year").notNull(),
  summary: text("summary").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceLabel: varchar("source_label").notNull(),
  sourceKind: varchar("source_kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkspaceUser = typeof usersTable.$inferSelect;
export type Workspace = typeof workspacesTable.$inferSelect;
export type LegalCase = typeof casesTable.$inferSelect;
export type SavedAuthority = typeof savedAuthoritiesTable.$inferSelect;