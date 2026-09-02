import { AuthAdapter, AuthCredential, AuthenticatedUser } from "./AuthAdapter";
import { WrksAdminClient } from "../wrks/WrksAdminClient";

export class WrksEncryptedSsoAuth implements AuthAdapter {
  readonly kind = "wrks-sso";

  constructor(
    private readonly wrks: WrksAdminClient,
    private readonly ssoSecret: string
  ) {}

  async authenticate(credential: AuthCredential): Promise<AuthenticatedUser | null> {
    if (credential.type !== "sso-code") return null;
    if (this.ssoSecret === "") {
      throw new Error(
        "WRKS_SSO_SECRET 미설정 — Wrks 암호화 SSO 미활성. support@wrks.ai에서 암호화 키 발급 후 설정하세요."
      );
    }
    const plain = this.decrypt(credential.code);
    const [email, , name] = plain.split("|");
    if (!email) return null;
    const user = await this.wrks.getUserByEmail(email);
    if (!user) return null;
    return {
      email: user.email,
      name: user.name || name || "",
      employeeId: user.employeeId,
      department: user.department,
      company: "AMO그룹",
    };
  }

  private decrypt(_code: string): string {
    throw new Error("Wrks SSO 복호화 미구현 — 암호화 알고리즘/키 스펙 확보 후 구현 예정");
  }
}
