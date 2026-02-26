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
  leftGlobalIndex?: number;
  rightGlobalIndex?: number;
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
  status?: "modified" | "added" | "deleted" | "renamed-only";
  unstagedStatus?: "modified" | "added" | "deleted" | "renamed-only";
  hasStaged: boolean;
  hasUnstaged: boolean;
  stagedOldPath?: string;
  unstagedOldPath?: string;
}

export interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
  hunkIndex?: number;
  hunkHeader?: string;
}

export interface LineGroupMap {
  lineToGroup: Map<number, number>;
  groups: Map<number, number[]>;
}
