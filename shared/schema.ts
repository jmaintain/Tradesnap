import { pgTable, text, serial, integer, boolean, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Instrument schema (futures contracts reference data)
export const instruments = pgTable("instruments", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  description: text("description").notNull(),
  tickSize: numeric("tick_size").notNull(),
  tickValue: numeric("tick_value").notNull(),
  pointValue: numeric("point_value").notNull(),
});

export const insertInstrumentSchema = createInsertSchema(instruments).omit({
  id: true,
});

export type InsertInstrument = z.infer<typeof insertInstrumentSchema>;
export type Instrument = typeof instruments.$inferSelect;

// Trade schema
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  symbol: text("symbol").notNull(),
  tradeType: text("trade_type").notNull(), // "long" or "short"
  quantity: integer("quantity").notNull(),
  entryPrice: numeric("entry_price").notNull(),
  exitPrice: numeric("exit_price"),  // Made optional to support ongoing trades
  stopLossPrice: numeric("stop_loss_price"), // Stop loss price for risk calculation
  isOngoing: boolean("is_ongoing").default(false), // Flag for ongoing trades
  date: timestamp("date").notNull(),
  entryTime: text("entry_time"), // Optional entry time
  pnlPoints: numeric("pnl_points"),
  pnlDollars: numeric("pnl_dollars"),
  riskRewardRatio: numeric("risk_reward_ratio"), // Added risk to reward ratio field
  notes: text("notes"),
  screenshots: jsonb("screenshots").$type<string[]>(), // URLs to the screenshots
  createdAt: timestamp("created_at").defaultNow(),
});

// Base schema for trades
export const baseTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  // PnL fields are calculated on the server
  pnlPoints: true,
  pnlDollars: true,
});

// Schema for trade insert/update with refinement
export const insertTradeSchema = baseTradeSchema.refine(data => {
  // If it's an ongoing trade, exit price is not required
  // If it's not ongoing, exit price is required
  return data.isOngoing === true || (data.exitPrice !== undefined && data.exitPrice !== null);
}, {
  message: "Exit price is required for completed trades",
  path: ["exitPrice"]
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

// Settings schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  defaultInstrument: text("default_instrument"),
  theme: text("theme").default("light"),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Journal entries schema
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  content: text("content").notNull(),
  mood: text("mood").default("neutral"),
  screenshots: jsonb("screenshots").$type<string[]>(), // Screenshots URLs or data URLs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

// Email subscribers schema
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  status: text("status").default("pending").notNull(), // Changed default from "active" to "pending"
  verificationToken: text("verification_token"),
  verificationExpires: timestamp("verification_expires"),
  verifiedAt: timestamp("verified_at"),
});

export const insertSubscriberSchema = createInsertSchema(subscribers).omit({
  id: true,
  createdAt: true,
  verificationToken: true,
  verificationExpires: true,
  verifiedAt: true,
});

export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribers.$inferSelect;
