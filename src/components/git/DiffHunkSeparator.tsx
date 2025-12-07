interface DiffHunkSeparatorProps {
  startLine: number;
  endLine: number;
}

export const DiffHunkSeparator = ({
  startLine,
  endLine,
}: DiffHunkSeparatorProps) => {
  return (
    <div className="bg-muted/30 border-y border-border px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
      <div className="flex-1 h-px bg-border"></div>
      <span>
        Lines {startLine}-{endLine}
      </span>
      <div className="flex-1 h-px bg-border"></div>
    </div>
  );
};
