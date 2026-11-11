import PgBoss from "pg-boss";

let boss: PgBoss | undefined;
export async function getQueue() {
  if (!boss) {
    boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
    boss.on("error", (error) => console.error("pg-boss:", error));
    await boss.start();
    await boss.createQueue("extract-exam");
  }
  return boss;
}
