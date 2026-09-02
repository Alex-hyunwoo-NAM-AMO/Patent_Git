import { AppConfig } from "../config";

export interface WrksUser {
  name: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
  role: string;
  raw: Record<string, unknown>;
}

export interface WrksDepartment {
  id: string;
  name: string;
  parentId: string | null;
  raw: Record<string, unknown>;
}

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

function normalizeUser(raw: Record<string, unknown>): WrksUser {
  return {
    name: pick(raw, ["userName", "name", "fullName", "displayName"]),
    email: pick(raw, ["email", "userEmail", "mail"]),
    employeeId: pick(raw, ["employeeId", "employeeNumber", "empNo", "sabun", "employee_id"]),
    department: pick(raw, ["departmentFullName", "workspaceName", "departmentName", "deptName", "department", "dept", "team"]),
    position: pick(raw, ["position", "jobTitle", "title", "rank", "grade"]),
    role: pick(raw, ["role", "userRole", "authority"]),
    raw,
  };
}

function normalizeDept(raw: Record<string, unknown>): WrksDepartment {
  const parent = pick(raw, ["parentId", "parent_id", "parentDepartmentId"]);
  return {
    id: pick(raw, ["id", "departmentId", "deptId", "code"]),
    name: pick(raw, ["name", "departmentName", "deptName"]),
    parentId: parent === "" ? null : parent,
    raw,
  };
}

function extractArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["data", "users", "items", "results", "list", "departments", "workspaces"]) {
      const val = obj[key];
      if (Array.isArray(val)) return val as Record<string, unknown>[];
      if (val && typeof val === "object") {
        const nested = extractArray(val);
        if (nested.length > 0) return nested;
      }
    }
  }
  return [];
}

export class WrksAdminClient {
  private readonly gateway: string;
  private readonly apiKey: string;
  private usersCache: WrksUser[] | null = null;
  private usersCacheAt = 0;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(cfg: AppConfig) {
    this.gateway = cfg.wrks.gateway.replace(/\/$/, "");
    this.apiKey = cfg.wrks.apiKey;
  }

  get configured(): boolean {
    return this.apiKey !== "";
  }

  private async request(path: string): Promise<unknown> {
    if (!this.configured) {
      throw new Error("WRKS_API_KEY 미설정 — 관리 API 호출 불가");
    }
    const res = await fetch(`${this.gateway}${path}`, {
      method: "GET",
      headers: { "API-KEY": this.apiKey, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Wrks API ${path} 실패: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async getAllUsers(force = false): Promise<WrksUser[]> {
    const now = Date.now();
    if (!force && this.usersCache && now - this.usersCacheAt < WrksAdminClient.CACHE_TTL_MS) {
      return this.usersCache;
    }
    const payload = await this.request("/admin/users?limit=1000");
    let rows = extractArray(payload);
    const total = this.readTotal(payload);
    if (total > rows.length) {
      rows = await this.pageThrough(rows.length ? rows.length : 10, total);
    }
    const users = rows.map(normalizeUser).filter((u) => u.email !== "");
    this.usersCache = users;
    this.usersCacheAt = now;
    return users;
  }

  private readTotal(payload: unknown): number {
    if (payload && typeof payload === "object") {
      const data = (payload as Record<string, unknown>).data;
      if (data && typeof data === "object") {
        const t = (data as Record<string, unknown>).totalUserCount;
        if (typeof t === "number") return t;
      }
    }
    return 0;
  }

  private async pageThrough(pageSize: number, total: number): Promise<Record<string, unknown>[]> {
    const all: Record<string, unknown>[] = [];
    const pages = Math.ceil(total / pageSize);
    for (let page = 1; page <= pages; page++) {
      const payload = await this.request(`/admin/users?page=${page}&limit=${pageSize}`);
      const rows = extractArray(payload);
      if (rows.length === 0) break;
      all.push(...rows);
    }
    return all;
  }

  async getUserByEmail(email: string): Promise<WrksUser | null> {
    const target = email.trim().toLowerCase();
    if (target === "") return null;
    const users = await this.getAllUsers();
    return users.find((u) => u.email.toLowerCase() === target) ?? null;
  }

  async searchUsers(query: string, limit = 10): Promise<WrksUser[]> {
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    const users = await this.getAllUsers();
    return users
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.employeeId.toLowerCase().includes(q)
      )
      .slice(0, limit);
  }

  async getDepartments(): Promise<WrksDepartment[]> {
    const payload = await this.request("/admin/departments");
    return extractArray(payload).map(normalizeDept);
  }
}
