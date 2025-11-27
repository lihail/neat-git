import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { GitBranch } from "lucide-react";

interface GitSetupDialogProps {
  open: boolean;
  onComplete: () => void;
}

export const GitSetupDialog = ({ open, onComplete }: GitSetupDialogProps) => {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [errors, setErrors] = useState({ name: "", email: "" });

  useEffect(() => {
    if (open) {
      loadGitConfig();
    }
  }, [open]);

  const loadGitConfig = async () => {
    if (typeof window === "undefined" || !window.ipcRenderer) return;

    setIsLoading(true);
    try {
      const result = await window.ipcRenderer.invoke("git:getGlobalConfig");
      if (result.success) {
        setUserName(result.userName || "");
        setUserEmail(result.userEmail || "");
        setHasExistingConfig(!!(result.userName && result.userEmail));
      }
    } catch (error) {
      console.error("Error loading git config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    // Validate
    const newErrors = { name: "", email: "" };
    let hasError = false;

    if (!userName.trim()) {
      newErrors.name = "Name is required";
      hasError = true;
    }

    if (!userEmail.trim()) {
      newErrors.email = "Email is required";
      hasError = true;
    } else if (!validateEmail(userEmail)) {
      newErrors.email = "Please enter a valid email address";
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) return;

    setIsSaving(true);
    try {
      const result = await window.ipcRenderer.invoke(
        "git:setGlobalConfig",
        userName.trim(),
        userEmail.trim()
      );

      if (result.success) {
        toast.success("Git configuration saved successfully");
        onComplete();
      } else {
        toast.error(result.error || "Failed to save Git configuration");
      }
    } catch (error) {
      console.error("Error saving git config:", error);
      toast.error("Failed to save Git configuration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" hideClose>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-primary/10 p-2">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl">Git Configuration</DialogTitle>
          </div>
          <DialogDescription>
            {hasExistingConfig ? (
              <>
                We've detected an existing Git configuration. Feel free to
                review or update your details below if you'd like.
              </>
            ) : (
              <>
                Welcome to NeatGit! To get started, please set your name and
                email for Git commits on this machine.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading Git configuration...
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="git-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="git-name"
                placeholder="John Doe"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: "" });
                }}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This will appear in your commit history
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="git-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="git-email"
                type="email"
                placeholder="john.doe@example.com"
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Used to associate commits with your identity
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving
              ? "Saving..."
              : hasExistingConfig
              ? "Confirm"
              : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
