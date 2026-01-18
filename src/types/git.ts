export interface SplitLine {
  leftLine?: {
    content: string;
    lineNumber?: number;
    type: "delete" | "context";
  };
  rightLine?: {
    content: string;
    lineNumber?: number;
    type: "add" | "context";
  };
}

export interface Hunk {
  index: number;
  header: string;
  lines: DiffLine[];
  startLine: number;
  endLine: number;
}

export interface Branch {
  name: string;
  current: boolean;
  behind?: number;
  ahead?: number;
  hasUpstream?: boolean;
  upstream?: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface Stash {
  index: number;
  message: string;
  date: string;
}

export interface FileChange {
  path: string;
  status: "added" | "deleted" | "modified";
  hasStaged: boolean;
  hasUnstaged: boolean;
}

export interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  lineNumber?: number;
  hunkIndex?: number;
  hunkHeader?: string;
}
