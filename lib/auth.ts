import { cookies } from "next/headers";
import { getDbPool } from "@/lib/db";

export const ALLOWED_LOGIN_EMAIL = "kanghyuck.im@gmail.com";

export interface SessionMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export async function getSessionMember(): Promise<SessionMember | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("authUser")?.value;
  if (!raw) return null;

  let email: string | undefined;
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    email = typeof decoded.email === "string" ? decoded.email : undefined;
  } catch {
    return null;
  }
  if (!email) return null;

  const pool = getDbPool();
  const result = await pool.query<{ id: string; name: string | null; role: string }>(
    `select u.id, u.name, coalesce(ur.role, 'user') as role
     from users u
     left join user_roles ur on ur.user_id = u.id
     where u.email = $1`,
    [email]
  );
  const row = result.rows[0];
  return row ? { id: row.id, email, name: row.name, role: row.role } : null;
}
