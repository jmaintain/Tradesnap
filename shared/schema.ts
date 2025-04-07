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
  exitPrice: numeric("exit_price").notNull(),
  date: timestamp("date").notNull(),
  pnlPoints: numeric("pnl_points"),
  pnlDollars: numeric("pnl_dollars"),
  notes: text("notes"),
  screenshots: jsonb("screenshots").$type<string[]>(), // URLs to the screenshots
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  // PnL fields are calculated on the server
  pnlPoints: true,
  pnlDollars: true,
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
