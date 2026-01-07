import { useEffect, useState, type KeyboardEvent } from "react";
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
import { Eye, EyeOff } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  loadingMessage: string;
  description: string;
  title?: string;
  initialUsername?: string;
  initialPassword?: string;
  onConfirm: (
    username: string,
    password: string,
    saveCredentials: boolean
  ) => Promise<void>;
  error?: string | null;
}

export const AuthDialog = ({
  open,
  onOpenChange,
  isLoading,
  loadingMessage,
  description,
  title,
  initialUsername = "",
  initialPassword = "",
  onConfirm,
  error: externalError,
}: AuthDialogProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saveCredentials, setSaveCredentials] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const error = externalError ?? internalError;

  const resetDialog = () => {
    setUsername("");
    setPassword("");
    setSaveCredentials(true);
    setShowPassword(false);
    setInternalError(null);
  };

  useEffect(() => {
    if (!open) {
      resetDialog();
    } else {
      // Prefill when dialog opens
      setUsername(initialUsername);
      setPassword(initialPassword);
    }
  }, [open, initialUsername, initialPassword]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen);
    }
  };

  const handleConfirm = async () => {
    if (!username.trim() || !password.trim()) {
      setInternalError("Please enter both username and password");
      return;
    }

    setInternalError(null);
    await onConfirm(username, password, saveCredentials);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isLoading) {
      return;
    }
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg pointer-events-auto">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">{loadingMessage}</p>
            </div>
          </div>
        )}
        <div className={isLoading ? "pointer-events-none" : ""}>
          <DialogHeader>
            <DialogTitle>{title ?? "Authentication Required"}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="auth-username">Username</Label>
              <Input
                id="auth-username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (internalError) {
                    setInternalError(null);
                  }
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Enter your username"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password">Password / Token</Label>
              <div className="relative">
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (internalError) {
                      setInternalError(null);
                    }
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Enter your password or personal access token"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-credentials"
                checked={saveCredentials}
                onCheckedChange={(checked) =>
                  setSaveCredentials(checked as boolean)
                }
              />
              <label
                htmlFor="save-credentials"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Save my credentials on this device
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || !username.trim() || !password.trim()}
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
