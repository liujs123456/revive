import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".config", "revive");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export interface ReviveConfig {
  anthropicApiKey: string;
  githubToken: string;
  githubUsername: string;
  localScanPath: string;
}

/**
 * Read config with this priority:
 * 1. ~/.config/revive/config.json (set via setup wizard)
 * 2. process.env (legacy / dev / docker)
 * Returns whatever fields are present; missing fields are empty strings.
 */
export function getConfig(): ReviveConfig {
  const fromFile = readFile();
  return {
    anthropicApiKey:
      fromFile?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "",
    githubToken: fromFile?.githubToken || process.env.GITHUB_TOKEN || "",
    githubUsername: fromFile?.githubUsername || process.env.GITHUB_USERNAME || "",
    localScanPath:
      fromFile?.localScanPath ||
      process.env.LOCAL_SCAN_PATH ||
      path.join(os.homedir(), "Desktop"),
  };
}

export function isConfigComplete(): boolean {
  const c = getConfig();
  return !!(c.anthropicApiKey && c.githubToken && c.githubUsername && c.localScanPath);
}

/**
 * Returns config with secrets masked, suitable for sending to the client.
 */
export function getConfigSafe(): {
  hasAnthropicKey: boolean;
  hasGithubToken: boolean;
  githubUsername: string;
  localScanPath: string;
  anthropicKeyPrefix: string;
  githubTokenPrefix: string;
  isComplete: boolean;
} {
  const c = getConfig();
  return {
    hasAnthropicKey: !!c.anthropicApiKey,
    hasGithubToken: !!c.githubToken,
    githubUsername: c.githubUsername,
    localScanPath: c.localScanPath,
    anthropicKeyPrefix: c.anthropicApiKey ? c.anthropicApiKey.slice(0, 14) + "…" : "",
    githubTokenPrefix: c.githubToken ? c.githubToken.slice(0, 14) + "…" : "",
    isComplete: isConfigComplete(),
  };
}

export function saveConfig(partial: Partial<ReviveConfig>): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const existing = readFile() ?? {};
  const merged = { ...existing, ...partial };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), { mode: 0o600 });
}

function readFile(): Partial<ReviveConfig> | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return null;
  }
}

export const CONFIG_LOCATION = CONFIG_PATH;
