// Reset the dev-seam test user (clerkId/username = "test_user_id") to a clean L1 state
// so L1 reward can fire fresh. Idempotent. Operates ONLY on dev.db.
import Database from "better-sqlite3";
const D = new Database("dev.db");
const CLERK = "test_user_id";
const row = D.prepare('SELECT id FROM "User" WHERE clerkId=?').get(CLERK);
if (row) {
  D.prepare('DELETE FROM "LessonProgress" WHERE userId=?').run(row.id);
  D.prepare('DELETE FROM "RewardEvent" WHERE userId=?').run(row.id);
  D.prepare('UPDATE "User" SET activeStep=1, xp=0, crystals=0 WHERE id=?').run(row.id);
  console.log("reset existing test_user_id row", row.id, "-> activeStep=1, xp=0, crystals=0, LP/RewardEvent cleared");
} else {
  console.log("no test_user_id row yet; /api/chat will upsert it fresh at activeStep=1 on first call");
}
const uch = D.prepare('SELECT id,username,activeStep FROM "User" WHERE username=?').get("Uchenik");
const lp = uch ? D.prepare('SELECT COUNT(*) c FROM "LessonProgress" WHERE userId=? AND completed=1').get(uch.id).c : 0;
console.log("Uchenik(demo) row:", JSON.stringify(uch), "completedLP=", lp, "(unlocks nav for demo mode)");
