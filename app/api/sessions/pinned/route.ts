import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { getAgentDir } from "@/lib/session-reader";

// This endpoint reads a mutable file. Without this, Next may cache the first
// GET response (often the initial empty array) across page loads.
export const dynamic = "force-dynamic";

const PINNED_FILE = join(getAgentDir(), "pinned-sessions.json");

function readIds(): string[] {
  try {
    if (!existsSync(PINNED_FILE)) return [];
    const raw = readFileSync(PINNED_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  const dir = dirname(PINNED_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(PINNED_FILE, JSON.stringify(ids, null, 2));
}

export async function GET() {
  try {
    return NextResponse.json(
      { pinnedIds: readIds() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, pinned } = await req.json() as { id: string; pinned: boolean };
    if (typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const ids = readIds();
    if (pinned) {
      if (!ids.includes(id)) ids.push(id);
    } else {
      const idx = ids.indexOf(id);
      if (idx !== -1) ids.splice(idx, 1);
    }
    writeIds(ids);
    return NextResponse.json({ ok: true, pinnedIds: ids });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
