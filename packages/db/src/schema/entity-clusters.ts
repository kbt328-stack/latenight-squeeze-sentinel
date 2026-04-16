import { pgTable, uuid, text, real, timestamp } from "drizzle-orm/pg-core";

export const entityClusters = pgTable("entity_clusters", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  confidence: real("confidence").notNull(),
  firstObservedCase: text("first_observed_case").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
