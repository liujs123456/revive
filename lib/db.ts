import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { Project } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "revive.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      url TEXT,
      health_score INTEGER,
      health_status TEXT,
      diagnosis TEXT,
      metadata_json TEXT NOT NULL,
      suggestions_json TEXT,
      scanned_at TEXT NOT NULL,
      analyzed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source);
    CREATE INDEX IF NOT EXISTS idx_projects_health ON projects(health_status);
  `);
}

export function upsertProject(p: Project): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO projects (id, source, name, path, description, url, health_score, health_status, diagnosis, metadata_json, suggestions_json, scanned_at, analyzed_at)
    VALUES (@id, @source, @name, @path, @description, @url, @health_score, @health_status, @diagnosis, @metadata_json, @suggestions_json, @scanned_at, @analyzed_at)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      path = excluded.path,
      description = excluded.description,
      url = excluded.url,
      metadata_json = excluded.metadata_json,
      scanned_at = excluded.scanned_at
  `).run({
    id: p.id,
    source: p.source,
    name: p.name,
    path: p.path,
    description: p.description ?? null,
    url: p.url ?? null,
    health_score: p.healthScore ?? null,
    health_status: p.healthStatus ?? null,
    diagnosis: p.diagnosis ?? null,
    metadata_json: JSON.stringify(p.metadata),
    suggestions_json: p.suggestions ? JSON.stringify(p.suggestions) : null,
    scanned_at: p.scannedAt,
    analyzed_at: p.analyzedAt ?? null,
  });
}

export function updateAnalysis(
  id: string,
  healthScore: number,
  healthStatus: string,
  diagnosis: string,
  suggestions: unknown[]
): void {
  const db = getDb();
  db.prepare(`
    UPDATE projects
    SET health_score = ?, health_status = ?, diagnosis = ?, suggestions_json = ?, analyzed_at = ?
    WHERE id = ?
  `).run(
    healthScore,
    healthStatus,
    diagnosis,
    JSON.stringify(suggestions),
    new Date().toISOString(),
    id
  );
}

interface ProjectRow {
  id: string;
  source: string;
  name: string;
  path: string;
  description: string | null;
  url: string | null;
  health_score: number | null;
  health_status: string | null;
  diagnosis: string | null;
  metadata_json: string;
  suggestions_json: string | null;
  scanned_at: string;
  analyzed_at: string | null;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    source: row.source as Project["source"],
    name: row.name,
    path: row.path,
    description: row.description ?? undefined,
    url: row.url ?? undefined,
    metadata: JSON.parse(row.metadata_json),
    healthScore: row.health_score ?? undefined,
    healthStatus: (row.health_status as Project["healthStatus"]) ?? undefined,
    diagnosis: row.diagnosis ?? undefined,
    suggestions: row.suggestions_json ? JSON.parse(row.suggestions_json) : undefined,
    scannedAt: row.scanned_at,
    analyzedAt: row.analyzed_at ?? undefined,
  };
}

export function listProjects(): Project[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM projects ORDER BY scanned_at DESC`).all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(id: string): Project | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : null;
}
