import { useState, useEffect, useRef } from "react";
import { HandHeart, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getGlobalConfig, setGlobalConfig } from "@/lib/git";
// import { themes, type ThemeId } from "@/lib/themes";
// import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/components/ui/toaster";
import { SupportNeatGitDialog } from "./SupportNeatGitDialog";

// const themeIds = Object.keys(themes) as ThemeId[];

export const SettingsDrawer = () => {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  // const { themeId, setThemeId } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isSupportNeatGitDialogOpen, setIsSupportNeatGitDialogOpen] = useState(false);

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
        <SheetContent side="right" className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Application preferences</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-8 flex-1 overflow-y-auto">
            {/* <section className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Appearance</h3>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="theme-select"
                  className="text-sm text-muted-foreground w-[35%] flex-shrink-0"
                >
                  Color Theme
                </label>
                <Select value={themeId} onValueChange={(value) => setThemeId(value as ThemeId)}>
                  <SelectTrigger id="theme-select" className="h-8 flex-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {themeIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {themes[id].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section> */}

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Git Configuration</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Changes here affect all git operations on this machine
                </p>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label
                      htmlFor="git-username"
                      className="text-sm text-muted-foreground w-[35%] flex-shrink-0"
                    >
                      Username
                    </label>
                    <Input
                      id="git-username"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      onBlur={saveGitConfigIfChanged}
                      onKeyDown={handleKeyDown}
                      placeholder="Not set"
                      className="h-8 flex-1 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label
                      htmlFor="git-email"
                      className="text-sm text-muted-foreground w-[35%] flex-shrink-0"
                    >
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
                      className="h-8 flex-1 text-sm"
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
          <section className="mt-auto">
            <div className="pt-4 border-t">
              <Button
                variant="default"
                onClick={() => setIsSupportNeatGitDialogOpen(true)}
                className="w-full"
              >
                Support NeatGit
                <HandHeart className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </SheetContent>
      </Sheet>

      <SupportNeatGitDialog
        open={isSupportNeatGitDialogOpen}
        onOpenChange={setIsSupportNeatGitDialogOpen}
      />
    </>
  );
};
