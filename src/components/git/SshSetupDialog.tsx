import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MouseEventHandler } from "react";

interface SshSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sshStep: "check" | "generate" | "show-key";
  sshHasExistingKeys: boolean;
  sshPublicKey: string;
  sshIsGenerating: boolean;
  onUseExistingKey: MouseEventHandler<HTMLButtonElement>;
  onGenerateSshKey: MouseEventHandler<HTMLButtonElement>;
  onCopySshKey: MouseEventHandler<HTMLButtonElement>;
  onRetryClone: MouseEventHandler<HTMLButtonElement>;
  onCancel: MouseEventHandler<HTMLButtonElement>;
}

export const SshSetupDialog = ({
  open,
  onOpenChange,
  sshStep,
  sshHasExistingKeys,
  sshPublicKey,
  sshIsGenerating,
  onUseExistingKey,
  onGenerateSshKey,
  onCopySshKey,
  onRetryClone,
  onCancel,
}: SshSetupDialogProps) => {
  const handleOpenChange = (newOpen: boolean) => {
    if (!sshIsGenerating) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>SSH Key Setup</DialogTitle>
          <DialogDescription>
            SSH authentication is required to clone this repository.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {sshStep === "check" && (
            <>
              {sshHasExistingKeys ? (
                <>
                  <div className="space-y-3">
                    <div className="p-4 bg-muted rounded-md space-y-2">
                      <p className="text-sm font-medium">
                        SSH keys found, but authentication failed.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your public key might not be added to the Git service yet, or you may need
                        to generate a new key.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={onUseExistingKey}
                        className="flex-1"
                        disabled={sshIsGenerating}
                      >
                        Show My Public Key
                      </Button>
                      <Button
                        onClick={onGenerateSshKey}
                        variant="outline"
                        className="flex-1"
                        disabled={sshIsGenerating}
                      >
                        {sshIsGenerating ? "Generating..." : "Generate New Key"}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm">No SSH keys found in your SSH keys folder.</p>
                  <p className="text-sm text-muted-foreground">
                    Generate a new SSH key to authenticate with Git services.
                  </p>
                </>
              )}
            </>
          )}

          {sshStep === "show-key" && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {sshHasExistingKeys ? "Your existing SSH public key:" : "SSH key created!"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Add this public key to your Git service (GitHub, GitLab, Bitbucket, etc.):
                </p>
              </div>

              <div className="space-y-2">
                <Label>Public Key</Label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={sshPublicKey}
                    className="w-full h-32 p-3 text-xs font-mono bg-muted border rounded-md resize-none"
                  />
                </div>
                <Button onClick={onCopySshKey} variant="outline" className="w-full">
                  Copy to Clipboard
                </Button>
              </div>

              <div className="space-y-2 p-4 bg-muted/50 rounded-md">
                <p className="text-sm font-medium">How to add your SSH key:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Copy the public key above</li>
                  <li>Go to your Git service's SSH keys settings</li>
                  <li>Add a new SSH key and paste the public key</li>
                  <li>Click "Retry Clone" below to try again</li>
                </ol>
              </div>

              <Button onClick={onRetryClone} className="w-full" size="lg">
                Retry Clone
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={sshIsGenerating}>
            Cancel
          </Button>
          {sshStep === "check" && !sshHasExistingKeys && (
            <Button onClick={onGenerateSshKey} disabled={sshIsGenerating}>
              {sshIsGenerating ? "Generating..." : "Generate SSH Key"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
