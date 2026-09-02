import * as crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { AuthenticatedUser } from "./AuthAdapter";

const COOKIE_NAME = "inv_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface SessionRecord {
  user: AuthenticatedUser;
  expiresAt: number;
}

export class SessionManager {
  private readonly store = new Map<string, SessionRecord>();
  private readonly secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  create(res: Response, user: AuthenticatedUser): void {
    const id = crypto.randomBytes(24).toString("hex");
    this.store.set(id, { user, expiresAt: Date.now() + SESSION_TTL_MS });
    const signed = `${id}.${this.sign(id)}`;
    res.cookie(COOKIE_NAME, signed, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_TTL_MS,
      path: "/",
    });
  }

  destroy(req: Request, res: Response): void {
    const id = this.readValidId(req);
    if (id) this.store.delete(id);
    res.clearCookie(COOKIE_NAME, { path: "/" });
  }

  read(req: Request): AuthenticatedUser | null {
    const id = this.readValidId(req);
    if (!id) return null;
    const record = this.store.get(id);
    if (!record) return null;
    if (record.expiresAt < Date.now()) {
      this.store.delete(id);
      return null;
    }
    return record.user;
  }

  private readValidId(req: Request): string | null {
    const raw = req.cookies?.[COOKIE_NAME];
    if (typeof raw !== "string" || !raw.includes(".")) return null;
    const [id, sig] = raw.split(".");
    if (!id || !sig) return null;
    const expected = this.sign(id);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    return id;
  }

  private sign(id: string): string {
    return crypto.createHmac("sha256", this.secret).update(id).digest("hex");
  }
}

export function requireAuth(sessions: SessionManager) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = sessions.read(req);
    if (!user) {
      res.status(401).json({ error: "인증이 필요합니다" });
      return;
    }
    (req as Request & { user: AuthenticatedUser }).user = user;
    next();
  };
}
