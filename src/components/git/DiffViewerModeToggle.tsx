import { FileText, List, Columns2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type DiffViewerMode = "full" | "hunks" | "split";

interface DiffViewerModeToggleProps {
  value: DiffViewerMode;
  onChange: (value: DiffViewerMode) => void;
}

export const DiffViewerModeToggle = ({
  value,
  onChange,
}: DiffViewerModeToggleProps) => {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
        if (newValue) {
          onChange(newValue as DiffViewerMode);
        }
      }}
      className="gap-0"
    >
      <ToggleGroupItem
        value="full"
        aria-label="Full view"
        className="h-7 px-2 text-xs gap-1"
      >
        <FileText className="h-3.5 w-3.5" />
        Full
      </ToggleGroupItem>
      <ToggleGroupItem
        value="hunks"
        aria-label="Hunks view"
        className="h-7 px-2 text-xs gap-1"
      >
        <List className="h-3.5 w-3.5" />
        Hunks
      </ToggleGroupItem>
      <ToggleGroupItem
        value="split"
        aria-label="Split view"
        className="h-7 px-2 text-xs gap-1"
      >
        <Columns2 className="h-3.5 w-3.5" />
        Split
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
