import { AuthAdapter, AuthCredential, AuthenticatedUser } from "./AuthAdapter";
import { WrksAdminClient } from "../wrks/WrksAdminClient";

function companyFromEmail(email: string): string {
  const domain = email.split("@")[1] ?? "";
  const map: Record<string, string> = {
    "amotech.co.kr": "(주)아모텍",
    "amolifescience.com": "아모라이프사이언스(주)",
    "amogreentech.com": "(주)아모그린텍",
    "amosense.co.kr": "(주)아모센스",
  };
  return map[domain] ?? "AMO그룹";
}

export class EmailDirectoryAuth implements AuthAdapter {
  readonly kind = "email-directory";

  constructor(private readonly wrks: WrksAdminClient) {}

  async authenticate(credential: AuthCredential): Promise<AuthenticatedUser | null> {
    if (credential.type !== "email") return null;
    const user = await this.wrks.getUserByEmail(credential.email);
    if (!user) return null;
    return {
      email: user.email,
      name: user.name,
      employeeId: user.employeeId,
      department: user.department,
      company: companyFromEmail(user.email),
    };
  }
}
