import { cn } from "@/lib/utils";

interface DiffLineRowProps {
  oldLineNumber?: number;
  newLineNumber?: number;
  singleColumn?: boolean;
  type?: "add" | "delete" | "context";
  shrink?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const DiffLineRow = ({
  oldLineNumber,
  newLineNumber,
  singleColumn,
  type,
  shrink,
  className,
  children,
}: DiffLineRowProps) => (
  <div
    className={cn(
      "flex border-l-2",
      type === "add" && "border-git-add bg-git-add/10 text-git-add",
      type === "delete" && "border-git-delete bg-git-delete/10 text-git-delete",
      type === "context" && "border-transparent text-foreground",
      !type && "border-transparent bg-muted/20",
      className
    )}
  >
    {singleColumn ? (
      <span
        className={cn(
          "mr-4 inline-block w-8 select-none text-right text-muted-foreground",
          shrink && "flex-shrink-0 self-start leading-[22px]"
        )}
      >
        {oldLineNumber ?? newLineNumber ?? ""}
      </span>
    ) : (
      <>
        <span
          className={cn(
            "inline-block w-8 select-none text-right text-muted-foreground",
            shrink && "flex-shrink-0 self-start leading-[22px]"
          )}
        >
          {oldLineNumber ?? ""}
        </span>
        <span
          className={cn(
            "mr-4 inline-block w-8 select-none text-right text-muted-foreground",
            shrink && "flex-shrink-0 self-start leading-[22px]"
          )}
        >
          {newLineNumber ?? ""}
        </span>
      </>
    )}
    <span
      className={cn(
        "mr-2 inline-block w-4 select-none",
        shrink && "flex-shrink-0 self-start leading-[22px]"
      )}
    >
      {type === "add" && "+"}
      {type === "delete" && "-"}
    </span>
    {children}
  </div>
);
