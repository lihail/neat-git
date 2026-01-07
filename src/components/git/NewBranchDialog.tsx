import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn, validateBranchName } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateBranch?: (branchName: string) => void;
  existingBranches?: string[];
}

export const NewBranchDialog = ({
  open,
  onOpenChange,
  onCreateBranch,
  existingBranches = [],
}: NewBranchDialogProps) => {
  const [newBranchName, setNewBranchName] = useState("");
  const [branchNameError, setBranchNameError] = useState<string | null>(null);

  const handleCreateBranch = () => {
    const trimmedName = newBranchName.trim();
    const error = validateBranchName(trimmedName);

    if (error) {
      setBranchNameError(error);
      return;
    }

    // Check if branch already exists
    if (existingBranches.includes(trimmedName)) {
      setBranchNameError("A branch with this name already exists");
      return;
    }

    if (onCreateBranch) {
      onCreateBranch(trimmedName);
      setNewBranchName("");
      onOpenChange(false);
      setBranchNameError(null);
    }
  };

  const handleBranchNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewBranchName(value);
    // Validate in real-time if there was a previous error
    if (branchNameError && value.trim()) {
      const error = validateBranchName(value.trim());
      if (error) {
        setBranchNameError(error);
      } else if (existingBranches.includes(value.trim())) {
        setBranchNameError("A branch with this name already exists");
      } else {
        setBranchNameError(null);
      }
    } else if (!value.trim()) {
      setBranchNameError(null);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setNewBranchName("");
      setBranchNameError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Branch</DialogTitle>
          <DialogDescription>
            Create a new branch from the current commit
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch Name</Label>
            <Input
              id="branch-name"
              autoFocus
              placeholder="feature/my-new-feature"
              value={newBranchName}
              onChange={handleBranchNameChange}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !branchNameError &&
                  newBranchName.trim()
                ) {
                  handleCreateBranch();
                } else if (e.key === "Escape") {
                  handleOpenChange(false);
                }
              }}
              className={cn(
                branchNameError &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
            {branchNameError && (
              <p className="text-sm text-destructive">{branchNameError}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateBranch}
            disabled={!newBranchName.trim() || branchNameError !== null}
          >
            Create Branch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
