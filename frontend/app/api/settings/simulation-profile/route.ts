import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PROFILE_FILE_PATH = path.resolve(process.cwd(), "../backend/simulation-profile.json");

export async function GET() {
  try {
    if (!fs.existsSync(PROFILE_FILE_PATH)) {
      return NextResponse.json({ profile: "standard" });
    }
    const content = fs.readFileSync(PROFILE_FILE_PATH, "utf-8");
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json({ profile: "standard", error: error.message });
  }
}

export async function POST(req: Request) {
  try {
    const { profile } = await req.json();
    if (!profile) {
      return NextResponse.json({ error: "profile is required" }, { status: 400 });
    }
    
    const settings = { profile };
    fs.writeFileSync(PROFILE_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8");
    
    return NextResponse.json({ ok: true, profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
