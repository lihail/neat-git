import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MouseEventHandler } from "react";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  iconClassName?: string;
}

export const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  iconClassName,
}: ActionButtonProps) => {
  return (
    <Button
      variant="ghost"
      className="flex flex-col items-center gap-1 h-auto py-1 w-16"
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className={cn("h-4 w-4", iconClassName)} />
      <span className="text-[10px]">{label}</span>
    </Button>
  );
};
