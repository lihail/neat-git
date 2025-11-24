import { GitCommit, User, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface CommitHistoryProps {
  commits: Commit[];
  selectedCommit?: string;
  onSelectCommit: (sha: string) => void;
}

export const CommitHistory = ({ commits, selectedCommit, onSelectCommit }: CommitHistoryProps) => {
  return (
    <div className="flex h-full flex-col border-t border-r border-border">
      <div className="border-b border-border p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GitCommit className="h-4 w-4 text-primary" />
          Commit History
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {commits.map((commit) => (
            <button
              key={commit.sha}
              onClick={() => onSelectCommit(commit.sha)}
              className={cn(
                "w-full rounded-md p-3 text-left transition-colors hover:bg-secondary",
                selectedCommit === commit.sha && "bg-secondary"
              )}
            >
              <div className="mb-2 flex items-start gap-2">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">{commit.message}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {commit.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {commit.date}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{commit.sha.slice(0, 7)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
