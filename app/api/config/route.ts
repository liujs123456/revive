import { NextResponse } from "next/server";
import { getConfigSafe, saveConfig, type ReviveConfig } from "@/lib/config";

export async function GET() {
  return NextResponse.json(getConfigSafe());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<ReviveConfig>;
  try {
    saveConfig(body);
    return NextResponse.json(getConfigSafe());
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
