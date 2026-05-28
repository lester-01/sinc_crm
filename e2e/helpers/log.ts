import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const sessionDir = process.env.E2E_SESSION_DIR;

export function testLog(testId: string, message: string, status?: "STEP" | "ASSERT" | "PASS" | "FAIL" | "START") {
  const tag = status ?? "STEP";
  const line = `[${testId}] ${tag} — ${message}`;
  console.log(line);
  if (!sessionDir) return;
  const slug = testId.toLowerCase();
  const dir = join(sessionDir, "tests", slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const logFile = join(dir, "test.log");
  writeFileSync(logFile, `${line}\n`, { flag: "a" });
}
