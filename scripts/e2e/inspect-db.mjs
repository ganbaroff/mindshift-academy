import Database from "better-sqlite3";
const D = new Database("dev.db");
const tables = D.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
console.log("TABLES:", tables.join(", "));
for (const n of ["User","Lesson","LessonProgress","RewardEvent","ParentalConsent","ConsentVerification"]) {
  try { console.log(n, "count=", D.prepare(`SELECT COUNT(*) AS c FROM "${n}"`).get().c); }
  catch (e) { console.log(n, "ERR", e.message); }
}
console.log("USERS:", JSON.stringify(D.prepare('SELECT id,clerkId,username,activeStep,xp,crystals FROM "User"').all(), null, 2));
console.log("LESSONS:", JSON.stringify(D.prepare('SELECT id,"order",title FROM "Lesson"').all()));
console.log("LP:", JSON.stringify(D.prepare('SELECT userId,lessonId,completed FROM "LessonProgress"').all()));
