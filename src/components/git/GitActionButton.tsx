import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GitActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  iconClassName?: string;
}

export const GitActionButton = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  iconClassName,
}: GitActionButtonProps) => {
  return (
    <Button
      variant="ghost"
      className="flex flex-col items-center gap-1 h-auto py-1 w-16 text-foreground"
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className={cn("h-4 w-4", iconClassName)} />
      <span className="text-[10px]">{label}</span>
    </Button>
  );
};
