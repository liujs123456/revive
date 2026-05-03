"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "@/components/project-card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { RefreshCw, Sparkles } from "lucide-react";
import type { Project, ScanResult } from "@/lib/types";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [scanning, setScanning] = useState(false);

  async function loadProjects() {
    const res = await fetch("/api/projects");
    const data = (await res.json()) as { projects: Project[] };
    setProjects(data.projects);
  }

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

  useEffect(() => {
    loadProjects();
  }, []);

  const local = projects?.filter((p) => p.source === "local") ?? [];
  const github = projects?.filter((p) => p.source === "github") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex items-start justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-foreground" />
              <h1 className="text-3xl font-bold tracking-tight">revive</h1>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Find your forgotten side projects and figure out what to ship next.
            </p>
          </div>
          <Button onClick={runScan} disabled={scanning} size="lg">
            <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning…" : "Scan projects"}
          </Button>
        </header>

        {projects === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onScan={runScan} scanning={scanning} />
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({projects.length})</TabsTrigger>
              <TabsTrigger value="local">Local ({local.length})</TabsTrigger>
              <TabsTrigger value="github">GitHub ({github.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6">
              <ProjectGrid projects={projects} />
            </TabsContent>
            <TabsContent value="local" className="mt-6">
              <ProjectGrid projects={local} />
            </TabsContent>
            <TabsContent value="github" className="mt-6">
              <ProjectGrid projects={github} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function ProjectGrid({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return <p className="text-muted-foreground text-sm">No projects in this category.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} />
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
