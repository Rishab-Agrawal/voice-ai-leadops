import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting, type SettingKey } from "@/lib/settings";

export async function GET() {
  return NextResponse.json(await getAllSettings());
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const allowed: SettingKey[] = ["autoDial"];
  for (const key of allowed) {
    if (key in body) {
      const v = String((body as Record<string, unknown>)[key]);
      if (key === "autoDial" && v !== "true" && v !== "false") {
        return NextResponse.json(
          { error: "autoDial must be 'true' or 'false'" },
          { status: 400 },
        );
      }
      await setSetting(key, v);
    }
  }
  return NextResponse.json(await getAllSettings());
}
