/**
 * CLI reset: `npm run db:reset`
 * Deletes the local database file (data/lead-os.db + WAL/SHM). Destructive —
 * asks for RESET to be passed as an argument to avoid accidents.
 */
import fs from "node:fs";
import path from "node:path";

if (process.argv[2] !== "RESET") {
  console.log('Refusing to delete the database. Run: npm run db:reset -- RESET');
  process.exit(1);
}
const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "lead-os.db");
for (const suffix of ["", "-wal", "-shm"]) {
  const p = `${file}${suffix}`;
  if (fs.existsSync(p)) {
    fs.rmSync(p);
    console.log(`Deleted ${p}`);
  }
}
console.log("Database reset. It will be recreated (with migrations) on next app start.");
