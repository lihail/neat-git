import { useState, useEffect, useRef } from "react";
import { Settings, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getGlobalConfig, setGlobalConfig } from "@/lib/git";
import { toast } from "@/components/ui/toaster";

export const SettingsDrawer = () => {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Track the last saved values to avoid unnecessary writes
  const savedValues = useRef({ userName: "", userEmail: "" });

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadGitConfig = async () => {
      setLoading(true);
      try {
        const result = await getGlobalConfig();
        if (result.success) {
          const name = result.userName || "";
          const email = result.userEmail || "";
          setUserName(name);
          setUserEmail(email);
          savedValues.current = { userName: name, userEmail: email };
        }
      } catch (error) {
        console.error("Failed to load git config:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGitConfig();
  }, [open]);

  const saveGitConfigIfChanged = async () => {
    const trimmedName = userName.trim();
    const trimmedEmail = userEmail.trim();

    if (
      trimmedName === savedValues.current.userName &&
      trimmedEmail === savedValues.current.userEmail
    ) {
      return;
    }

    try {
      const result = await setGlobalConfig(trimmedName, trimmedEmail);
      if (result.success) {
        savedValues.current = { userName: trimmedName, userEmail: trimmedEmail };
        setUserName(trimmedName);
        setUserEmail(trimmedEmail);
      } else {
        toast.error("Failed to save git configuration");
      }
    } catch (error) {
      console.error("Failed to save git config:", error);
      toast.error("Failed to save git configuration");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-9 w-9 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Git Configuration</h3>
                <p className="text-xs text-muted-foreground mt-1">Global git identity</p>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-1" />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="git-username" className="text-xs text-muted-foreground">
                        Username
                      </label>
                      <Input
                        id="git-username"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        onBlur={saveGitConfigIfChanged}
                        onKeyDown={handleKeyDown}
                        placeholder="Not set"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-1" />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="git-email" className="text-xs text-muted-foreground">
                        Email
                      </label>
                      <Input
                        id="git-email"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        onBlur={saveGitConfigIfChanged}
                        onKeyDown={handleKeyDown}
                        placeholder="Not set"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
