import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LineStagingButtonProps {
  isStaged?: boolean;
  onClick: () => void;
  sticky?: boolean;
}

export const LineStagingButton = ({
  isStaged,
  onClick,
  sticky = false,
}: LineStagingButtonProps) => {
  //
  return (
    <Button
      size="sm"
      variant="default"
      onClick={onClick}
      className={cn(
        "h-[22px] px-2 text-xs text-black opacity-0 group-hover:opacity-100 z-20",
        sticky
          ? "sticky right-4 flex-shrink-0 ml-auto"
          : "absolute right-4 top-1/2 -translate-y-1/2"
      )}
    >
      {isStaged ? "Unstage" : "Stage"}
    </Button>
  );
};
