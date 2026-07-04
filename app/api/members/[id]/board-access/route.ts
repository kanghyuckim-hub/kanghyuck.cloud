import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const pool = getDbPool();
    const result = await pool.query<{ board_key: string }>(
      "select board_key from user_board_access where user_id = $1",
      [id]
    );
    return NextResponse.json({ boardKeys: result.rows.map((row) => row.board_key) });
  } catch (error) {
    console.error("Error fetching board access:", error);
    return NextResponse.json(
      { error: "게시판 권한을 불러오는 중 오류가 발생했습니다.", boardKeys: [] },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as { boardKeys?: unknown };
  if (!Array.isArray(body.boardKeys) || !body.boardKeys.every((key) => typeof key === "string")) {
    return NextResponse.json({ error: "boardKeys는 문자열 배열이어야 합니다." }, { status: 400 });
  }
  const boardKeys = body.boardKeys as string[];

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("delete from user_board_access where user_id = $1", [id]);
    for (const boardKey of boardKeys) {
      await client.query(
        `insert into user_board_access (user_id, board_key)
         values ($1, $2)
         on conflict (user_id, board_key) do nothing`,
        [id, boardKey]
      );
    }
    await client.query("commit");
    return NextResponse.json({ ok: true, boardKeys });
  } catch (error) {
    await client.query("rollback");
    console.error("Error updating board access:", error);
    return NextResponse.json({ error: "게시판 권한을 저장하는 중 오류가 발생했습니다." }, { status: 500 });
  } finally {
    client.release();
  }
}
