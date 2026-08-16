import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    displayName: text("display_name").notNull(),
    url: text("url").notNull(),
    title: text("title"),
    description: text("description"),
    openGraphTitle: text("open_graph_title"),
    openGraphDescription: text("open_graph_description"),
    twitterTitle: text("twitter_title"),
    twitterDescription: text("twitter_description"),
    canonicalUrl: text("canonical_url"),
    siteName: text("site_name"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_submissions_owner_user_id").on(table.ownerUserId),
    index("idx_submissions_updated_at").on(table.updatedAt),
  ],
);
