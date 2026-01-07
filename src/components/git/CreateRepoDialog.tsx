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

interface CreateRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedParentPath: string;
  repoName: string;
  repoNameError: string | null;
  isLoading: boolean;
  onRepoNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CreateRepoDialog = ({
  open,
  onOpenChange,
  selectedParentPath,
  repoName,
  repoNameError,
  isLoading,
  onRepoNameChange,
  onConfirm,
  onCancel,
}: CreateRepoDialogProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !repoNameError) {
      onConfirm();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Repository</DialogTitle>
          <DialogDescription>
            Enter a name for your new Git repository. It will be created in:{" "}
            <span className="font-mono text-xs block mt-2 text-foreground">
              {selectedParentPath}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="repo-name">Repository Name</Label>
            <Input
              id="repo-name"
              placeholder="my-awesome-project"
              value={repoName}
              onChange={onRepoNameChange}
              onKeyDown={handleKeyDown}
              className={repoNameError ? "border-destructive" : ""}
              autoFocus
            />
            {repoNameError && (
              <p className="text-sm text-destructive">{repoNameError}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Repository"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
