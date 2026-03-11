import { useState, useEffect, ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ChevronDown, Sparkles } from "lucide-react";
import { useLicenseActivation } from "@/hooks/useLicenseActivation";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { claimLicense } from "@/lib/license";
import { toast } from "sonner";
import { NeatGitSupporterGratitudeCard } from "./NeatGitSupporterGratitudeCard";

interface SupportNeatGitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupportNeatGitDialog = ({ open, onOpenChange }: SupportNeatGitDialogProps) => {
  const { isActivated, activateLicense } = useLicenseActivation();
  const [step, setStep] = useState<"donate" | "activate">("donate");
  const [transactionId, setTransactionId] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep("donate");
      setTransactionId("");
      setLicenseKey("");
      setClaimError(null);
      setActivationError(null);
    }
  }, [open]);

  const handleClaimAndActivate = async () => {
    const trimmed = transactionId.trim();
    if (!trimmed) {
      return;
    }

    setIsClaiming(true);
    setClaimError(null);

    const claimResult = await claimLicense(trimmed);
    if (!claimResult.success) {
      setClaimError("error" in claimResult ? claimResult.error : "Claim failed.");
      setIsClaiming(false);
      return;
    }

    const activateResult = await activateLicense(claimResult.licenseKey);
    setIsClaiming(false);

    if (activateResult.success) {
      onOpenChange(false);
      toast.success("NeatGit activated — thank you for your support!");
    } else {
      setClaimError(activateResult.error ?? "Failed to activate. Please try again.");
    }
  };

  const handleActivateWithKey = async () => {
    const trimmed = licenseKey.trim();
    if (!trimmed) {
      return;
    }

    setIsActivating(true);
    setActivationError(null);
    const result = await activateLicense(trimmed);
    if (result.success) {
      onOpenChange(false);
      toast.success("NeatGit activated — thank you for your support!");
    } else {
      setActivationError(result.error ?? "Invalid license key.");
    }
    setIsActivating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Support NeatGit</DialogTitle>
          <DialogDescription>
            Unlock premium features by supporting NeatGit's development.
          </DialogDescription>
        </DialogHeader>

        {step === "donate" ? (
          <>
            {isActivated ? (
              <NeatGitSupporterGratitudeCard />
            ) : (
              <Card className="p-4 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">What you'll unlock</h3>
                </div>
                <ul className="space-y-1.5">
                  {["Beautiful color themes", "More features coming soon…"].map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto rounded-lg mt-2">
              <iframe
                id="kofiframe"
                src="https://ko-fi.com/lihail/?hidefeed=true&widget=true&embed=true&preview=true"
                className="w-full h-full min-h-[640px]"
                style={{ padding: "4px", background: "#FFFFFF" }}
                loading="lazy"
                title="Ko-fi donation widget"
              />
            </div>

            {!isActivated && (
              <>
                <Separator className="mt-1" />
                <Button variant="outline" className="w-full" onClick={() => setStep("activate")}>
                  Already donated? Claim your license →
                </Button>
              </>
            )}
          </>
        ) : (
          /* Step 2: Claim & Activate */
          <div className="flex flex-col gap-6 mt-2 flex-1 min-h-0">
            <button
              onClick={() => setStep("donate")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium">Claim your license</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the Ko-fi transaction ID from your receipt email.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 1a2b3c4d-5e6f-…"
                  value={transactionId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setTransactionId(e.target.value);
                    setClaimError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleClaimAndActivate()}
                />
                <Button
                  onClick={handleClaimAndActivate}
                  disabled={!transactionId.trim() || isClaiming}
                >
                  {isClaiming ? "Activating…" : "Claim & Activate"}
                </Button>
              </div>
              {claimError && <p className="text-sm text-destructive">{claimError}</p>}
            </div>

            <Separator />

            {/* Fallback: already have a key */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                Already have a license key?
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="neat-git-…"
                    value={licenseKey}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setLicenseKey(e.target.value);
                      setActivationError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleActivateWithKey()}
                  />
                  <Button
                    onClick={handleActivateWithKey}
                    disabled={!licenseKey.trim() || isActivating}
                  >
                    {isActivating ? "Verifying…" : "Activate"}
                  </Button>
                </div>
                {activationError && <p className="text-sm text-destructive">{activationError}</p>}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
