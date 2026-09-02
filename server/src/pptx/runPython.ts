import { spawn } from "child_process";
import { AppConfig } from "../config";

export function runPython(cfg: AppConfig, script: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cfg.paths.pythonBin, [script, ...args], {
      cwd: cfg.paths.serverRoot,
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`python ${script} 실패 (code ${code}): ${stderr || stdout}`));
      }
    });
  });
}
