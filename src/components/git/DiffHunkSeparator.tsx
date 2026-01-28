interface DiffHunkSeparatorProps {
  startLine: number;
  endLine: number;
  stickyHorizontal?: boolean;
}

export const DiffHunkSeparator = ({
  startLine,
  endLine,
  stickyHorizontal = false,
}: DiffHunkSeparatorProps) => {
  return (
    <div
      className={`bg-card border-y border-border px-4 py-2 text-xs text-muted-foreground text-center sticky top-0 z-20 ${stickyHorizontal ? "left-0 max-w-[100cqw]" : ""}`}
    >
      Lines {startLine}-{endLine}
    </div>
  );
};
