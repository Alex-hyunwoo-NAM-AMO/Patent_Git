import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import * as path from "path";
import { loadConfig, AppConfig } from "./config";
import { WrksAdminClient } from "./wrks/WrksAdminClient";
import { AuthAdapter } from "./auth/AuthAdapter";
import { EmailDirectoryAuth } from "./auth/EmailDirectoryAuth";
import { WrksEncryptedSsoAuth } from "./auth/WrksEncryptedSsoAuth";
import { SessionManager, requireAuth } from "./auth/SessionManager";
import { AuthenticatedUser } from "./auth/AuthAdapter";

function buildAuthAdapter(cfg: AppConfig, wrks: WrksAdminClient): AuthAdapter {
  if (cfg.auth.provider === "wrks-sso") {
    return new WrksEncryptedSsoAuth(wrks, cfg.auth.wrksSsoSecret);
  }
  return new EmailDirectoryAuth(wrks);
}

function createApp(cfg: AppConfig): express.Express {
  const wrks = new WrksAdminClient(cfg);
  const auth = buildAuthAdapter(cfg, wrks);
  const sessions = new SessionManager(cfg.auth.sessionSecret);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const router = express.Router();

  router.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      auth: auth.kind,
      ai: cfg.ai.provider,
      wrksConfigured: wrks.configured,
      time: new Date().toISOString(),
    });
  });

  router.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body ?? {};
      const user =
        typeof code === "string" && code !== ""
          ? await auth.authenticate({ type: "sso-code", code })
          : typeof email === "string" && email !== ""
            ? await auth.authenticate({ type: "email", email })
            : null;
      if (!user) {
        res.status(401).json({ error: "회사 계정을 확인할 수 없습니다" });
        return;
      }
      sessions.create(res, user);
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "로그인 실패" });
    }
  });

  router.post("/api/logout", (req: Request, res: Response) => {
    sessions.destroy(req, res);
    res.json({ ok: true });
  });

  router.get("/api/me", requireAuth(sessions), (req: Request, res: Response) => {
    res.json({ user: (req as Request & { user: AuthenticatedUser }).user });
  });

  router.get("/api/inventors/search", requireAuth(sessions), async (req: Request, res: Response) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    try {
      const results = await wrks.searchUsers(q);
      res.json({
        results: results.map((u) => ({
          name: u.name,
          email: u.email,
          department: u.department,
          employeeId: u.employeeId,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "검색 실패" });
    }
  });

  router.use(express.static(path.join(cfg.paths.serverRoot, "public")));

  const mount = cfg.server.basePath || "/";
  app.use(mount, router);

  return app;
}

function main(): void {
  const cfg = loadConfig();
  const app = createApp(cfg);
  app.listen(cfg.server.port, () => {
    const base = cfg.server.basePath || "";
    console.log(`직무발명신고서 서버 기동: http://127.0.0.1:${cfg.server.port}${base}`);
    console.log(`  auth=${cfg.auth.provider} ai=${cfg.ai.provider} wrks=${cfg.wrks.gateway}`);
  });
}

if (require.main === module) {
  main();
}

export { createApp };
