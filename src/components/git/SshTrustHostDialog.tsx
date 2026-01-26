import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SshTrustHostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostname: string;
  isTrusting: boolean;
  onTrust: () => void;
  onCancel: () => void;
}

export const SshTrustHostDialog = ({
  open,
  onOpenChange,
  hostname,
  isTrusting,
  onTrust,
  onCancel,
}: SshTrustHostDialogProps) => {
  const handleOpenChange = (newOpen: boolean) => {
    if (!isTrusting) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trust SSH Host</DialogTitle>
          <DialogDescription>First time connecting to this host.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm">
              The authenticity of host <code className="font-semibold">{hostname}</code> can't be
              verified.
            </p>
            <p className="text-sm mt-2 text-muted-foreground">
              Do you want to trust this host and add it to your known hosts?
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isTrusting}>
            Cancel
          </Button>
          <Button onClick={onTrust} disabled={isTrusting}>
            {isTrusting ? "Trusting..." : "Trust Host"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
