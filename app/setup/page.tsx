"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FieldState = "idle" | "testing" | "valid" | "invalid";

interface FieldStatus {
  state: FieldState;
  message?: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [anthropicKey, setAnthropicKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [localScanPath, setLocalScanPath] = useState("");
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);

  const [anthropicStatus, setAnthropicStatus] = useState<FieldStatus>({ state: "idle" });
  const [githubStatus, setGithubStatus] = useState<FieldStatus>({ state: "idle" });
  const [saving, setSaving] = useState(false);

  // Pre-load existing config if any
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => {
        if (c.githubUsername) setGithubUsername(c.githubUsername);
        if (c.localScanPath) setLocalScanPath(c.localScanPath);
        // Mark already-set fields as valid (don't expose values)
        if (c.hasAnthropicKey) {
          setAnthropicStatus({ state: "valid", message: `Saved: ${c.anthropicKeyPrefix}` });
        }
        if (c.hasGithubToken) {
          setGithubStatus({ state: "valid", message: `Saved: ${c.githubTokenPrefix}` });
        }
      });
  }, []);

  async function testAnthropic() {
    if (!anthropicKey) {
      toast.error("Paste an API key first");
      return;
    }
    setAnthropicStatus({ state: "testing" });
    const res = await fetch("/api/config/test-anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: anthropicKey }),
    });
    const data = await res.json();
    if (data.ok) {
      setAnthropicStatus({ state: "valid", message: "Key works ✓" });
    } else {
      setAnthropicStatus({ state: "invalid", message: data.error });
    }
  }

  async function testGithub() {
    if (!githubToken) {
      toast.error("Paste a GitHub token first");
      return;
    }
    setGithubStatus({ state: "testing" });
    const res = await fetch("/api/config/test-github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: githubToken }),
    });
    const data = await res.json();
    if (data.ok) {
      setGithubStatus({
        state: "valid",
        message: `Authenticated as ${data.username}`,
      });
      setGithubUsername(data.username);
    } else {
      setGithubStatus({ state: "invalid", message: data.error });
    }
  }

  const canSave =
    anthropicStatus.state === "valid" &&
    githubStatus.state === "valid" &&
    githubUsername &&
    localScanPath;

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        githubUsername,
        localScanPath,
      };
      if (anthropicKey) payload.anthropicApiKey = anthropicKey;
      if (githubToken) payload.githubToken = githubToken;

      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      toast.success("Saved! Opening dashboard…");
      setTimeout(() => router.push("/"), 600);
    } catch (err) {
      toast.error((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <Toaster richColors />
      <div className="max-w-2xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6" />
            <h1 className="text-3xl font-bold tracking-tight">Set up revive</h1>
          </div>
          <p className="text-muted-foreground">
            One-time setup. Paste 3 things, click Save, you&apos;re done. Saved to{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              ~/.config/revive/config.json
            </code>{" "}
            (chmod 600).
          </p>
        </header>

        <div className="space-y-6">
          {/* Anthropic */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">1. Anthropic API key</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Powers Claude analysis (~1–3¢ per project).{" "}
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 underline hover:text-foreground"
                    >
                      Get one
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
                <StatusPill status={anthropicStatus} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="anthropic-key" className="sr-only">
                Anthropic API key
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="anthropic-key"
                    type={showAnthropicKey ? "text" : "password"}
                    placeholder="sk-ant-api03-…"
                    value={anthropicKey}
                    onChange={(e) => {
                      setAnthropicKey(e.target.value);
                      setAnthropicStatus({ state: "idle" });
                    }}
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAnthropicKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={testAnthropic}
                  disabled={!anthropicKey || anthropicStatus.state === "testing"}
                >
                  {anthropicStatus.state === "testing" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Test"
                  )}
                </Button>
              </div>
              {anthropicStatus.message && (
                <p
                  className={cn(
                    "text-xs",
                    anthropicStatus.state === "valid" && "text-emerald-600",
                    anthropicStatus.state === "invalid" && "text-red-600"
                  )}
                >
                  {anthropicStatus.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* GitHub */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">2. GitHub fine-grained token</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Lets revive read your repos.{" "}
                    <a
                      href="https://github.com/settings/tokens?type=beta"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 underline hover:text-foreground"
                    >
                      Create one
                      <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    — needs <span className="font-mono">Contents: Read</span> +{" "}
                    <span className="font-mono">Metadata: Read</span> on All repositories.
                  </p>
                </div>
                <StatusPill status={githubStatus} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="github-token"
                    type={showGithubToken ? "text" : "password"}
                    placeholder="github_pat_…"
                    value={githubToken}
                    onChange={(e) => {
                      setGithubToken(e.target.value);
                      setGithubStatus({ state: "idle" });
                    }}
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubToken((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGithubToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={testGithub}
                  disabled={!githubToken || githubStatus.state === "testing"}
                >
                  {githubStatus.state === "testing" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Test"
                  )}
                </Button>
              </div>
              {githubStatus.message && (
                <p
                  className={cn(
                    "text-xs",
                    githubStatus.state === "valid" && "text-emerald-600",
                    githubStatus.state === "invalid" && "text-red-600"
                  )}
                >
                  {githubStatus.message}
                </p>
              )}
              {githubUsername && (
                <div className="pt-2">
                  <Label htmlFor="github-username" className="text-xs text-muted-foreground">
                    Username (auto-detected from token)
                  </Label>
                  <Input
                    id="github-username"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    className="mt-1"
                    readOnly
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Local path */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold">3. Local scan path</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Folder revive walks to find local projects (anywhere with a{" "}
                <code className="text-xs bg-muted px-1 rounded">.git</code> /{" "}
                <code className="text-xs bg-muted px-1 rounded">package.json</code> /{" "}
                <code className="text-xs bg-muted px-1 rounded">pyproject.toml</code> /{" "}
                <code className="text-xs bg-muted px-1 rounded">Cargo.toml</code>).
              </p>
            </CardHeader>
            <CardContent>
              <Label htmlFor="local-path" className="sr-only">
                Local scan path
              </Label>
              <Input
                id="local-path"
                placeholder="/Users/you/Desktop"
                value={localScanPath}
                onChange={(e) => setLocalScanPath(e.target.value)}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            All values stored locally on your machine. Nothing leaves your computer except calls to
            Anthropic + GitHub APIs.
          </p>
          <Button onClick={save} disabled={!canSave || saving} size="lg">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Save &amp; open dashboard
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: FieldStatus }) {
  if (status.state === "valid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
        <CheckCircle2 className="h-4 w-4" />
        OK
      </span>
    );
  }
  if (status.state === "invalid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 shrink-0">
        <AlertCircle className="h-4 w-4" />
        Error
      </span>
    );
  }
  if (status.state === "testing") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground shrink-0">
        <Loader2 className="h-3 w-3 animate-spin" />
        Testing
      </span>
    );
  }
  return null;
}
