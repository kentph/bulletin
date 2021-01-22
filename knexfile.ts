import dotenv from "dotenv";
dotenv.config();

const sqlite = {
  client: "sqlite3",
  connection: {
    filename: "./db.sqlite3",
  },
  // Mandatory
  useNullAsDefault: true,
};

const postgresHeroku = {
  client: "postgresql",

  // https://help.heroku.com/MDM23G46/why-am-i-getting-an-error-when-i-upgrade-to-pg-8
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  },

  // To keep consistent with sqlite
  useNullAsDefault: true,

  // Should already be defaults.
  // pool: {
  //   min: 2,
  //   max: 10,
  // },
  // migrations: {
  //   tableName: "knex_migrations",
  // },
};

const configByDbClient = {
  sqlite,
  postgresHeroku,

  // TODO consider also supporting custom Postgres instance.

  /**
   * Allow testing with different REACT_APP_DB_CLIENTs as well
   * by defining per-database overrides in this
   * object.
   */
  test: {
    sqlite: {
      ...sqlite,
      connection: {
        filename: "./test.sqlite3",
      },
    },

    // TODO consider testing with Postgres instance.
  },
};

const dbClient =
  (process.env.REACT_APP_DB_CLIENT as keyof typeof configByDbClient) ||
  "sqlite";

// Knex CLI and API expect the exported object to be keyed by
// NODE_ENV, but in our case we also want to support different
// types of dbs no matter the environment. To get around this,
// we add another env var REACT_APP_DB_CLIENT to identify the database
// type.
export default {
  development: configByDbClient[dbClient],
  production: configByDbClient[dbClient],
  // Change this to dbClient if we support more than one testing db type.
  test: configByDbClient.test["sqlite"],
};
