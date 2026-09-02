import { loadConfig } from "../config";
import { WrksAdminClient } from "./WrksAdminClient";

function maskKey(key: string): string {
  if (key.length <= 12) return "****";
  return `${key.slice(0, 9)}...${key.slice(-4)}`;
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  console.log(`[test] gateway=${cfg.wrks.gateway} key=${maskKey(cfg.wrks.apiKey)}`);
  const client = new WrksAdminClient(cfg);
  if (!client.configured) {
    console.error("[test] WRKS_API_KEY 미설정 — .env 확인 필요");
    process.exit(1);
  }

  const users = await client.getAllUsers();
  console.log(`[test] 전 직원 수: ${users.length}`);
  const sample = users[0];
  console.log(
    `[test] 샘플 직원: name='${sample.name}' dept='${sample.department}' ` +
      `pos='${sample.position}' emp='${sample.employeeId}' email(masked)='${sample.email.replace(/(.{2}).*(@.*)/, "$1***$2")}'`
  );

  const byEmail = await client.getUserByEmail(sample.email);
  console.log(`[test] getUserByEmail 재조회: ${byEmail ? "성공" : "실패"}`);

  const depts = await client.getDepartments();
  console.log(`[test] 부서 수: ${depts.length}, 예: ${depts.slice(0, 3).map((d) => d.name).join(", ")}`);

  if (users.length > 0 && byEmail) {
    console.log("[test] PASS");
  } else {
    console.error("[test] FAIL");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[test] 예외:", err instanceof Error ? err.message : err);
  process.exit(1);
});
