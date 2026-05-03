"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ProjectCard } from "@/components/project-card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  RefreshCw,
  Sparkles,
  Settings,
  Search,
  X,
  Zap,
  StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, ScanResult, HealthStatus } from "@/lib/types";

type SourceFilter = "all" | "local" | "github";
type HealthFilter = "all" | "unanalyzed" | HealthStatus;

const HEALTH_FILTERS: { key: HealthFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unanalyzed", label: "Not analyzed" },
  { key: "abandoned", label: "Abandoned" },
  { key: "wip", label: "WIP" },
  { key: "shipped", label: "Shipped" },
  { key: "polished", label: "Polished" },
];

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [configChecked, setConfigChecked] = useState(false);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");

  // Bulk analyze state
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, current: "" });
  const cancelRef = useRef(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => {
        if (!c.isComplete) router.replace("/setup");
        else setConfigChecked(true);
      });
  }, [router]);

  async function loadProjects() {
    const res = await fetch("/api/projects");
    const data = (await res.json()) as { projects: Project[] };
    setProjects(data.projects);
  }

  useEffect(() => {
    if (configChecked) loadProjects();
  }, [configChecked]);

  async function runScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = (await res.json()) as ScanResult;
      if (result.errors.length > 0) {
        toast.error(`Scan finished with errors: ${result.errors.join("; ")}`);
      } else {
        toast.success(
          `Scanned ${result.scanned} projects (${result.added} new, ${result.updated} updated)`
        );
      }
      await loadProjects();
    } catch (err) {
      toast.error(`Scan failed: ${(err as Error).message}`);
    } finally {
      setScanning(false);
    }
  }

  // Counts for chips
  const counts = useMemo(() => {
    const c = {
      all: projects?.length ?? 0,
      local: 0,
      github: 0,
      unanalyzed: 0,
      abandoned: 0,
      wip: 0,
      shipped: 0,
      polished: 0,
    };
    for (const p of projects ?? []) {
      if (p.source === "local") c.local += 1;
      if (p.source === "github") c.github += 1;
      if (!p.healthStatus) c.unanalyzed += 1;
      else c[p.healthStatus] += 1;
    }
    return c;
  }, [projects]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!projects) return [];
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
      if (healthFilter !== "all") {
        if (healthFilter === "unanalyzed") {
          if (p.healthStatus) return false;
        } else if (p.healthStatus !== healthFilter) {
          return false;
        }
      }
      if (q) {
        const hay = `${p.name} ${p.description ?? ""} ${p.metadata.primaryLanguage ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [projects, search, sourceFilter, healthFilter]);

  const unanalyzedCount = counts.unanalyzed;
  // Rough estimate: ~$0.025 per project (Haiku diagnose + Sonnet suggest)
  const estimatedCost = (unanalyzedCount * 0.025).toFixed(2);

  async function bulkAnalyze() {
    if (unanalyzedCount === 0) return;
    const confirmed = confirm(
      `Analyze ${unanalyzedCount} project${unanalyzedCount === 1 ? "" : "s"}?\n\n` +
        `Estimated cost: ~$${estimatedCost} in Anthropic API charges (Haiku diagnose + Sonnet suggestions).\n\n` +
        `Estimated time: ~${Math.ceil((unanalyzedCount * 25) / 60)} minutes.`
    );
    if (!confirmed) return;

    setBulkRunning(true);
    cancelRef.current = false;

    const queue = (projects ?? []).filter((p) => !p.healthStatus);
    setBulkProgress({ done: 0, total: queue.length, current: "" });

    let success = 0;
    let failed = 0;
    for (let i = 0; i < queue.length; i++) {
      if (cancelRef.current) break;
      const p = queue[i];
      setBulkProgress({ done: i, total: queue.length, current: p.name });
      try {
        const res = await fetch(`/api/projects/${p.id}/analyze`, { method: "POST" });
        if (res.ok) success += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }

    setBulkProgress({ done: queue.length, total: queue.length, current: "" });
    setBulkRunning(false);
    await loadProjects();

    const stopped = cancelRef.current;
    if (stopped) {
      toast.info(`Bulk analyze stopped — ${success} done, ${failed} failed`);
    } else if (failed === 0) {
      toast.success(`Analyzed ${success} project${success === 1 ? "" : "s"} ✓`);
    } else {
      toast.warning(`${success} analyzed, ${failed} failed`);
    }
  }

  function cancelBulk() {
    cancelRef.current = true;
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-foreground" />
              <h1 className="text-3xl font-bold tracking-tight">revive</h1>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Find your forgotten side projects and figure out what to ship next.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/setup">
              <Button variant="outline" size="lg" title="Edit configuration">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button onClick={runScan} disabled={scanning || bulkRunning} size="lg">
              <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning…" : "Scan projects"}
            </Button>
          </div>
        </header>

        {projects === null ? (
          <SkeletonGrid />
        ) : projects.length === 0 ? (
          <EmptyState onScan={runScan} scanning={scanning} />
        ) : (
          <>
            {bulkRunning ? (
              <BulkProgress progress={bulkProgress} onCancel={cancelBulk} />
            ) : (
              unanalyzedCount > 0 && (
                <div className="mb-6 flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">
                      {unanalyzedCount} project{unanalyzedCount === 1 ? "" : "s"} not yet analyzed
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Estimated cost: ~${estimatedCost} ·{" "}
                      ~{Math.ceil((unanalyzedCount * 25) / 60)} min
                    </p>
                  </div>
                  <Button onClick={bulkAnalyze} disabled={scanning}>
                    <Zap className="h-4 w-4" />
                    Analyze all
                  </Button>
                </div>
              )
            )}

            <div className="space-y-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search projects by name, description, language…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Source
                </span>
                <Chip
                  active={sourceFilter === "all"}
                  onClick={() => setSourceFilter("all")}
                  count={counts.all}
                >
                  All
                </Chip>
                <Chip
                  active={sourceFilter === "local"}
                  onClick={() => setSourceFilter("local")}
                  count={counts.local}
                >
                  Local
                </Chip>
                <Chip
                  active={sourceFilter === "github"}
                  onClick={() => setSourceFilter("github")}
                  count={counts.github}
                >
                  GitHub
                </Chip>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Health
                </span>
                {HEALTH_FILTERS.map((f) => (
                  <Chip
                    key={f.key}
                    active={healthFilter === f.key}
                    onClick={() => setHealthFilter(f.key)}
                    count={f.key === "all" ? counts.all : counts[f.key as keyof typeof counts]}
                  >
                    {f.label}
                  </Chip>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No projects match these filters.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-transparent text-foreground border-border hover:border-foreground/40"
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("opacity-70", active ? "text-background" : "text-muted-foreground")}>
          {count}
        </span>
      )}
    </button>
  );
}

function BulkProgress({
  progress,
  onCancel,
}: {
  progress: { done: number; total: number; current: string };
  onCancel: () => void;
}) {
  const pct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
  return (
    <div className="mb-6 p-4 rounded-lg border bg-muted/30 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            Analyzing {progress.done + 1} of {progress.total}
            {progress.current && (
              <span className="text-muted-foreground"> — {progress.current}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ~25s per project. Each one writes to the DB as it finishes — it&apos;s safe to close
            the tab; partial results stick around.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <StopCircle className="h-4 w-4" />
          Stop after current
        </Button>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  );
}

function EmptyState({ onScan, scanning }: { onScan: () => void; scanning: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No projects scanned yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Hit scan to discover projects in your local Desktop and your GitHub account.
      </p>
      <Button onClick={onScan} disabled={scanning} size="lg">
        <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
        {scanning ? "Scanning…" : "Run first scan"}
      </Button>
    </div>
  );
}
