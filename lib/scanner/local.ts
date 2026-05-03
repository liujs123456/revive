import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import type { Project, ProjectMetadata } from "../types";

const PROJECT_MARKERS = [
  "package.json",
  "Cargo.toml",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  ".git",
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  ".cache",
  ".DS_Store",
]);

const CI_FILES = [
  ".github/workflows",
  ".gitlab-ci.yml",
  ".circleci",
  "azure-pipelines.yml",
];

const DEPLOY_FILES = [
  "vercel.json",
  "netlify.toml",
  "Dockerfile",
  "docker-compose.yml",
  "fly.toml",
  "railway.json",
  "render.yaml",
];

const TEST_DIRS = ["tests", "test", "__tests__", "spec"];

function isProjectRoot(dir: string): boolean {
  return PROJECT_MARKERS.some((marker) => fs.existsSync(path.join(dir, marker)));
}

function projectId(absPath: string): string {
  return "local:" + crypto.createHash("sha1").update(absPath).digest("hex").slice(0, 16);
}

function readReadme(dir: string): string | undefined {
  for (const name of ["README.md", "readme.md", "README", "Readme.md"]) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p, "utf-8").slice(0, 5000);
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function detectLanguages(dir: string): { primary?: string; all: string[] } {
  const counts: Record<string, number> = {};
  const langByExt: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript",
    js: "JavaScript",
    jsx: "JavaScript",
    py: "Python",
    rs: "Rust",
    go: "Go",
    java: "Java",
    rb: "Ruby",
    swift: "Swift",
    kt: "Kotlin",
    cpp: "C++",
    c: "C",
    cs: "C#",
    php: "PHP",
  };

  function walk(d: string, depth = 0) {
    if (depth > 3) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        walk(full, depth + 1);
      } else {
        const ext = e.name.split(".").pop()?.toLowerCase();
        if (ext && langByExt[ext]) {
          counts[langByExt[ext]] = (counts[langByExt[ext]] ?? 0) + 1;
        }
      }
    }
  }
  walk(dir);

  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
  return {
    primary: sorted[0]?.[0],
    all: sorted.map(([lang]) => lang),
  };
}

function hasTests(dir: string): boolean {
  if (TEST_DIRS.some((td) => fs.existsSync(path.join(dir, td)))) return true;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.some(
      (e) => e.isFile() && (e.name.includes(".test.") || e.name.includes(".spec."))
    );
  } catch {
    return false;
  }
}

function hasCi(dir: string): boolean {
  return CI_FILES.some((f) => fs.existsSync(path.join(dir, f)));
}

function hasDeployment(dir: string): boolean {
  return DEPLOY_FILES.some((f) => fs.existsSync(path.join(dir, f)));
}

function getLastModified(dir: string): string {
  try {
    const out = execSync(`git -C "${dir}" log -1 --format=%cI`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    if (out) return out;
  } catch {
  }
  try {
    return fs.statSync(dir).mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function getCommitCount(dir: string): number | undefined {
  try {
    const out = execSync(`git -C "${dir}" rev-list --count HEAD`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return parseInt(out, 10);
  } catch {
    return undefined;
  }
}

function getDescription(dir: string): string | undefined {
  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.description) return pkg.description;
    } catch {}
  }
  const readme = readReadme(dir);
  if (readme) {
    const lines = readme.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      if (line.startsWith("#")) continue;
      const cleaned = line.replace(/[*_`]/g, "").trim();
      if (cleaned.length > 20) return cleaned.slice(0, 200);
    }
  }
  return undefined;
}

function buildMetadata(dir: string): ProjectMetadata {
  const langs = detectLanguages(dir);
  const readme = readReadme(dir);
  return {
    hasReadme: !!readme,
    hasTests: hasTests(dir),
    hasCi: hasCi(dir),
    hasPackageJson: fs.existsSync(path.join(dir, "package.json")),
    hasDeployment: hasDeployment(dir),
    primaryLanguage: langs.primary,
    languages: langs.all,
    lastModified: getLastModified(dir),
    commitCount: getCommitCount(dir),
    readmePreview: readme,
  };
}

export function scanLocalProjects(rootPath: string, maxDepth = 2): Project[] {
  const projects: Project[] = [];
  const visited = new Set<string>();

  function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;
    if (visited.has(dir)) return;
    visited.add(dir);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);

      if (isProjectRoot(full)) {
        try {
          projects.push({
            id: projectId(full),
            source: "local",
            name: e.name,
            path: full,
            description: getDescription(full),
            metadata: buildMetadata(full),
            scannedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.warn(`Failed to scan ${full}:`, err);
        }
      } else {
        walk(full, depth + 1);
      }
    }
  }

  walk(rootPath, 0);
  return projects;
}
