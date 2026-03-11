import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { BorderBeam } from "./BorderBeam";

export const NeatGitSupporterGratitudeCard = () => {
  return (
    <BorderBeam
      size={100}
      durationSeconds={10}
      colorFromToken="primary-60"
      colorToToken="primary-100"
    >
      <Card
        className="relative overflow-hidden rounded-lg border border-primary/40 bg-gradient-to-br from-card via-card to-primary/20"
        style={{
          boxShadow:
            "inset 0 1px 0 hsl(var(--foreground)/0.06), inset 0 -1px 0 hsl(var(--background)/0.3), 0 14px 36px hsl(var(--background)/0.45)",
        }}
      >
        <div className="pointer-events-none absolute inset-[1px] rounded-[calc(0.5rem-1px)] border border-foreground/5" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-primary/20 rounded-full blur-md animate-pulse" />
              <div className="relative rounded-full bg-primary/10 p-2 ring-1 ring-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">You are a NeatGit Supporter</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                NeatGit Premium is activated - thank you for your support!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </BorderBeam>
  );
};
