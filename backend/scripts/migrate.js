import { migrateDatabase } from "../src/db/migrate.js";
import { closeDb, getDbPath } from "../src/db/connection.js";

const runMigration = async () => {
  try {
    const result = await migrateDatabase();
    // eslint-disable-next-line no-console
    console.log(`Migration complete. Imported ${result.productsImported} products from ${result.sourceFile}.`);
    // eslint-disable-next-line no-console
    console.log(`SQLite database: ${getDbPath()}`);
  } finally {
    await closeDb();
  }
};

runMigration().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
