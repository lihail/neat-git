import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MouseEventHandler } from "react";

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText: string;
  buttonLoadingText?: string;
  isLoading?: boolean;
  onClick: MouseEventHandler<HTMLElement>;
}

export const ActionCard = ({
  icon: Icon,
  title,
  description,
  buttonText,
  buttonLoadingText,
  isLoading = false,
  onClick,
}: ActionCardProps) => {
  return (
    <Card
      className="p-6 hover:border-primary transition-colors cursor-pointer flex flex-col"
      onClick={onClick}
    >
      <div className="mb-6 flex justify-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Icon className="h-10 w-10 text-primary" />
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-4 text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6 flex-1">{description}</p>
      <Button onClick={onClick} className="w-full gap-2" variant="outline" disabled={isLoading}>
        <Icon className="h-4 w-4" />
        {isLoading && buttonLoadingText ? buttonLoadingText : buttonText}
      </Button>
    </Card>
  );
};
