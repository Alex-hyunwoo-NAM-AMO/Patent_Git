export interface AuthenticatedUser {
  email: string;
  name: string;
  employeeId: string;
  department: string;
  company: string;
}

export interface AuthAdapter {
  readonly kind: string;
  authenticate(credential: AuthCredential): Promise<AuthenticatedUser | null>;
}

export type AuthCredential =
  | { type: "email"; email: string }
  | { type: "sso-code"; code: string };
