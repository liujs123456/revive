export type ProjectSource = "local" | "github";

export type HealthStatus = "abandoned" | "wip" | "shipped" | "polished";

export type SuggestionCategory = "technical" | "feature" | "resume" | "pivot";
export type Effort = "small" | "medium" | "large";
export type Impact = "low" | "medium" | "high";

export interface Suggestion {
  category: SuggestionCategory;
  title: string;
  detail: string;
  effort: Effort;
  impact: Impact;
}

export interface ProjectMetadata {
  hasReadme: boolean;
  hasTests: boolean;
  hasCi: boolean;
  hasPackageJson: boolean;
  hasDeployment: boolean;
  primaryLanguage?: string;
  languages?: string[];
  lastModified: string;
  commitCount?: number;
  stars?: number;
  openIssues?: number;
  fileCount?: number;
  readmePreview?: string;
}

export interface Project {
  id: string;
  source: ProjectSource;
  name: string;
  path: string;
  description?: string;
  url?: string;
  metadata: ProjectMetadata;
  healthScore?: number;
  healthStatus?: HealthStatus;
  diagnosis?: string;
  suggestions?: Suggestion[];
  scannedAt: string;
  analyzedAt?: string;
}

export interface ScanResult {
  scanned: number;
  added: number;
  updated: number;
  errors: string[];
}
