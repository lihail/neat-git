import { useState, useEffect, MouseEventHandler, KeyboardEvent } from "react";
import { FolderOpen } from "lucide-react";
import { extractCredentialsFromUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface CloneRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cloneUrl: string;
  cloneDestination: string;
  cloneUrlError: string | null;
  isLoading: boolean;
  fullClonePath: string;
  onCloneUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectDestination: MouseEventHandler<HTMLButtonElement>;
  onConfirm: (saveCredentials: boolean) => void;
  onCancel: () => void;
}

export const CloneRepoDialog = ({
  open,
  onOpenChange,
  cloneUrl,
  cloneDestination,
  cloneUrlError,
  isLoading,
  fullClonePath,
  onCloneUrlChange,
  onSelectDestination,
  onConfirm,
  onCancel,
}: CloneRepoDialogProps) => {
  const [saveCredentials, setSaveCredentials] = useState(true);

  const hasEmbeddedCredentials = extractCredentialsFromUrl(cloneUrl) !== null;

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSaveCredentials(true);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !cloneUrlError && !isLoading) {
      onConfirm(hasEmbeddedCredentials && saveCredentials);
    } else if (event.key === "Escape" && !isLoading) {
      onCancel();
    }
  };

  const handleConfirm = () => {
    onConfirm(hasEmbeddedCredentials && saveCredentials);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg pointer-events-auto">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Cloning repository...</p>
            </div>
          </div>
        )}
        <div className={isLoading ? "pointer-events-none" : ""}>
          <DialogHeader>
            <DialogTitle>Clone Repository</DialogTitle>
            <DialogDescription>
              Enter the repository URL and select a destination folder to clone into.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clone-url">Repository URL</Label>
              <Input
                id="clone-url"
                placeholder="https://github.com/user/repo.git"
                value={cloneUrl}
                onChange={onCloneUrlChange}
                onKeyDown={handleKeyDown}
                className={cloneUrlError ? "border-destructive" : ""}
                autoFocus
              />
              {cloneUrlError && <p className="text-sm text-destructive">{cloneUrlError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clone-destination">Destination Folder</Label>
              <div className="flex gap-2">
                <Input
                  id="clone-destination"
                  placeholder="Select destination folder..."
                  value={cloneDestination}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={onSelectDestination} variant="outline" type="button">
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {cloneUrl && cloneDestination && (
              <div className="space-y-2">
                <Label>Will clone to:</Label>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-sm text-foreground break-all">{fullClonePath}</code>
                </div>
              </div>
            )}

            {hasEmbeddedCredentials && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-credentials"
                  checked={saveCredentials}
                  onCheckedChange={(checked) => setSaveCredentials(checked as boolean)}
                />
                <label
                  htmlFor="save-credentials"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Save my credentials on this device
                </label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || !cloneUrl.trim() || !cloneDestination}
            >
              {isLoading ? "Cloning..." : "Clone Repository"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
