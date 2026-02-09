import { Button } from "@/components/ui/button";

interface DiffHunkSeparatorProps {
  startLine: number;
  endLine: number;
  stickyHorizontal?: boolean;
  isStaged?: boolean;
  onStageHunk?: () => void;
  onUnstageHunk?: () => void;
}

export const DiffHunkSeparator = ({
  startLine,
  endLine,
  stickyHorizontal = false,
  isStaged,
  onStageHunk,
  onUnstageHunk,
}: DiffHunkSeparatorProps) => {
  const showButton = onStageHunk || onUnstageHunk;
  const buttonText = isStaged ? "Unstage" : "Stage";
  const handleClick = isStaged ? onUnstageHunk : onStageHunk;

  return (
    <div
      className={`bg-card border-y border-border px-4 py-2 text-xs text-muted-foreground sticky top-0 z-30 flex items-center h-10 relative ${stickyHorizontal ? "left-0 max-w-[100cqw]" : ""}`}
    >
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        Lines {startLine}-{endLine}
      </span>
      {showButton && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClick}
          className="h-6 px-2 text-xs ml-auto relative z-10"
        >
          {buttonText}
        </Button>
      )}
    </div>
  );
};
