import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export interface MemberItem {
  id: string;
  googleSub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
  picture: string | null;
  locale: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: string;
}

interface MemberRow {
  id: string;
  google_sub: string;
  email: string;
  email_verified: boolean;
  name: string | null;
  given_name: string | null;
  family_name: string | null;
  picture: string | null;
  locale: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  role: string;
}

export async function GET() {
  try {
    const pool = getDbPool();
    const result = await pool.query<MemberRow>(`
      select
        u.id,
        u.google_sub,
        u.email,
        u.email_verified,
        u.name,
        u.given_name,
        u.family_name,
        u.picture,
        u.locale,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        coalesce(ur.role, 'user') as role
      from users u
      left join user_roles ur on ur.user_id = u.id
      order by u.created_at desc
    `);

    const members: MemberItem[] = result.rows.map((row) => ({
      id: row.id,
      googleSub: row.google_sub,
      email: row.email,
      emailVerified: row.email_verified,
      name: row.name,
      givenName: row.given_name,
      familyName: row.family_name,
      picture: row.picture,
      locale: row.locale,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      role: row.role,
    }));

    return NextResponse.json({ members, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({
      error: "회원 목록을 불러오는 중 오류가 발생했습니다.",
      members: [],
      fetchedAt: new Date().toISOString(),
    });
  }
}
