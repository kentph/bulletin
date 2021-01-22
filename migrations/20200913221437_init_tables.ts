import Knex from "knex";

export async function up(knex: Knex): Promise<void> {
  return (
    knex.schema

      .createTable("users", (users) => {
        // Adds primary key at id column.
        users.increments();
        users.text("username").unique().notNullable();
        users.timestamps();
      })

      .createTable("clients", (clients) => {
        clients.increments();
        clients.text("name").unique().notNullable();
        clients.integer("user_id").index().unsigned().notNullable();
        clients.timestamps();

        clients.foreign("user_id").references("id").inTable("users");
      })

      .createTable("auth", (auth) => {
        auth.increments();
        auth.text("username").unique().notNullable();
        auth.integer("user_id").unique().unsigned().notNullable();
        auth.text("hashed").notNullable();
        auth.timestamps();

        auth.foreign("user_id").references("id").inTable("users");
      })

      .createTable("feeds", (feeds) => {
        feeds.increments();
        feeds.integer("user_id").unique().unsigned().notNullable();
        feeds.json("feed_groups").notNullable();
        feeds.timestamps();

        feeds.foreign("user_id").references("id").inTable("users");
      })

      .createTable("entry_cache", (entryCache) => {
        entryCache.increments();
        // TODO just make this two separate columns?
        entryCache
          .text("source_and_id")
          .unique()
          .notNullable()
          .comment("Combo of source and id of feed.");
        entryCache.json("entries").notNullable();
        entryCache.timestamps();
      })

      // Combining markedAsRead/Spoken, starred, and visitedLinks tables into one to save rows.
      .createTable("entry_status", (entryStatus) => {
        entryStatus.increments();
        // Not unique since multiple users can read the same entry.
        entryStatus.text("entry_id").notNullable();
        entryStatus.json("entry").comment("For starred entries");
        entryStatus.integer("user_id").index().unsigned().notNullable();
        entryStatus.text("feed_name").notNullable();
        entryStatus.text("url");

        // TODO validate that at least one of below timestamps are not null.

        entryStatus.timestamp("read_at");
        entryStatus.timestamp("spoken_at");
        entryStatus.timestamp("starred_at");
        entryStatus.timestamp("visited_at");
        entryStatus.timestamps();

        // Make sure only one row exists per entry, per user.
        entryStatus.unique(["user_id", "entry_id"]);
        entryStatus.foreign("user_id").references("id").inTable("users");
      })

      .createTable("intervals", (intervals) => {
        intervals.increments();
        intervals.integer("user_id").index().unsigned().notNullable();
        intervals.integer("client_id").index().unsigned().notNullable();
        intervals
          .enum("type", ["LINK_READING_ESTIMATE", "ACTIVE_IN_APP"])
          .notNullable();
        intervals.text("entry_id");
        intervals.text("feed_name");
        intervals.timestamp("started_at").notNullable();
        intervals.timestamp("ended_at").notNullable();
        intervals.timestamps();

        intervals.foreign("user_id").references("id").inTable("users");
        intervals.foreign("client_id").references("id").inTable("clients");
        intervals.unique(["user_id", "client_id", "started_at"]);
      })

      .createTable("settings", (settings) => {
        settings.increments();
        settings.integer("user_id").index().unsigned().notNullable();
        settings.integer("client_id").index().unsigned().notNullable();
        settings.json("data");
        settings.timestamps();

        settings.foreign("user_id").references("id").inTable("users");
        settings.foreign("client_id").references("id").inTable("clients");
        settings.unique(["user_id", "client_id"]);
      })

      .createTable("archives", (archives) => {
        archives.increments();
        archives.integer("user_id").index().unsigned().notNullable();
        archives.json("data").notNullable();
        archives.timestamp("threshold_at").notNullable();
        archives.timestamps();

        archives.foreign("user_id").references("id").inTable("users");
      })
  );
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .dropTable("users")
    .dropTable("auth")
    .dropTable("feeds")
    .dropTable("entry_status")
    .dropTable("intervals")
    .dropTable("settings")
    .dropTable("entry_cache")
    .dropTable("archives")
    .dropTable("clients");
}
