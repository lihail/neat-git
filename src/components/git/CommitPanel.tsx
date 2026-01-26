import { useState } from "react";
import { GitCommit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CommitPanelProps {
  stagedFilesCount: number;
  onCommit: (message: string, description?: string) => void;
}

export const CommitPanel = ({
  stagedFilesCount,
  onCommit,
}: CommitPanelProps) => {
  const [message, setMessage] = useState("");

  const handleCommit = () => {
    if (message.trim()) {
      onCommit(message);
      setMessage("");
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="mb-4">
        <Input
          placeholder="Commit message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="font-mono text-sm"
        />
      </div>
      <Button
        onClick={handleCommit}
        disabled={!message.trim() || stagedFilesCount === 0}
        className="w-full gap-2"
      >
        <GitCommit className="h-4 w-4" />
        Commit
      </Button>
    </div>
  );
};
