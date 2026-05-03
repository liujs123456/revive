import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { getProject } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (project.source !== "local") {
    return NextResponse.json(
      { error: "Only local projects can be revealed in Finder" },
      { status: 400 }
    );
  }

  try {
    const child = spawn("open", [project.path], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
