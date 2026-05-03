import { NextResponse } from "next/server";
import { scanLocalProjects } from "@/lib/scanner/local";
import { scanGithubRepos } from "@/lib/scanner/github";
import { upsertProject, listProjects } from "@/lib/db";
import type { Project, ScanResult } from "@/lib/types";

export async function POST(req: Request) {
  const { sources } = (await req.json().catch(() => ({}))) as {
    sources?: ("local" | "github")[];
  };
  const enabled = sources ?? ["local", "github"];

  const result: ScanResult = { scanned: 0, added: 0, updated: 0, errors: [] };
  const existing = new Set(listProjects().map((p) => p.id));
  const newProjects: Project[] = [];

  if (enabled.includes("local")) {
    const localPath = process.env.LOCAL_SCAN_PATH;
    if (!localPath) {
      result.errors.push("LOCAL_SCAN_PATH not set");
    } else {
      try {
        const local = scanLocalProjects(localPath);
        newProjects.push(...local);
      } catch (err) {
        result.errors.push(`Local scan failed: ${(err as Error).message}`);
      }
    }
  }

  if (enabled.includes("github")) {
    const username = process.env.GITHUB_USERNAME;
    if (!username) {
      result.errors.push("GITHUB_USERNAME not set");
    } else {
      try {
        const gh = await scanGithubRepos(username);
        newProjects.push(...gh);
      } catch (err) {
        result.errors.push(`GitHub scan failed: ${(err as Error).message}`);
      }
    }
  }

  for (const p of newProjects) {
    upsertProject(p);
    result.scanned += 1;
    if (existing.has(p.id)) result.updated += 1;
    else result.added += 1;
  }

  return NextResponse.json(result);
}
