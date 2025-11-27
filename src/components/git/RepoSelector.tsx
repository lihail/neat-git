import { FolderOpen, X, GitBranch, FolderPlus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "@/components/ui/toaster";
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
import { Checkbox } from "@/components/ui/checkbox";

interface RepoSelectorProps {
  onSelectRepo: (path: string) => void;
  onCancel?: () => void;
  onCloningChange?: (isCloning: boolean) => void;
}

export const RepoSelector = ({
  onSelectRepo,
  onCancel,
  onCloningChange,
}: RepoSelectorProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedParentPath, setSelectedParentPath] = useState<string>("");
  const [repoName, setRepoName] = useState("");
  const [repoNameError, setRepoNameError] = useState<string | null>(null);

  // Clone repository state
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneUrl, setCloneUrl] = useState("");
  const [cloneDestination, setCloneDestination] = useState("");
  const [cloneUrlError, setCloneUrlError] = useState<string | null>(null);

  // Authentication state
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authHost, setAuthHost] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [saveCredentials, setSaveCredentials] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // SSH setup state
  const [showSshDialog, setShowSshDialog] = useState(false);
  const [sshStep, setSshStep] = useState<"check" | "generate" | "show-key">(
    "check"
  );
  const [sshHasExistingKeys, setSshHasExistingKeys] = useState(false);
  const [sshPublicKey, setSshPublicKey] = useState("");
  const [sshIsGenerating, setSshIsGenerating] = useState(false);

  // SSH trust host state
  const [showSshTrustDialog, setShowSshTrustDialog] = useState(false);
  const [sshTrustHostname, setSshTrustHostname] = useState("");
  const [sshIsTrusting, setSshIsTrusting] = useState(false);

  const validateRepoName = (name: string): string | null => {
    if (!name.trim()) {
      return "Repository name cannot be empty";
    }

    // Git repository naming rules
    if (name.startsWith(".")) {
      return "Repository name cannot start with a dot";
    }
    if (name.endsWith(".git")) {
      return "Repository name cannot end with .git";
    }
    if (name.endsWith(".lock")) {
      return "Repository name cannot end with .lock";
    }
    if (name.includes("..")) {
      return "Repository name cannot contain consecutive dots";
    }
    if (/[\s~^:?*\[\]\\]/.test(name)) {
      return "Repository name cannot contain spaces or special characters (~^:?*[]\\)";
    }
    if (name.includes("/")) {
      return "Repository name cannot contain slashes";
    }
    if (name.length > 255) {
      return "Repository name is too long (max 255 characters)";
    }

    return null;
  };

  const extractRepoNameFromUrl = (url: string): string => {
    try {
      // Remove trailing slashes and .git extension
      let repoPath = url
        .trim()
        .replace(/\.git$/, "")
        .replace(/\/$/, "");

      // Extract the last part of the URL path
      const parts = repoPath.split("/");
      const repoName = parts[parts.length - 1];

      return repoName || "repo";
    } catch {
      return "repo";
    }
  };

  const extractHostFromUrl = (url: string): string => {
    try {
      // Handle HTTPS/HTTP URLs
      if (url.startsWith("http://") || url.startsWith("https://")) {
        const urlObj = new URL(url);
        return urlObj.hostname;
      }

      // Handle SSH URLs (git@github.com:user/repo.git)
      if (url.startsWith("git@")) {
        const match = url.match(/^git@([^:]+):/);
        return match ? match[1] : "remote server";
      }

      // Handle git:// URLs
      if (url.startsWith("git://")) {
        const urlObj = new URL(url);
        return urlObj.hostname;
      }

      return "remote server";
    } catch {
      return "remote server";
    }
  };

  const extractCredentialsFromUrl = (url: string): { username: string; password: string } | null => {
    try {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        const urlObj = new URL(url);
        if (urlObj.username || urlObj.password) {
          return {
            username: decodeURIComponent(urlObj.username),
            password: decodeURIComponent(urlObj.password),
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const isSshUrl = (url: string): boolean => {
    return /^git@.+:.+/.test(url.trim());
  };

  const validateCloneUrl = (url: string): string | null => {
    const trimmedUrl = url.trim();

    // If empty, don't show error (button will be disabled)
    if (!trimmedUrl) {
      return null;
    }

    // Check for common Git URL patterns
    const isHttpUrl = /^https?:\/\/.+/.test(trimmedUrl);
    const isSshUrl = /^git@.+:.+/.test(trimmedUrl);
    const isGitUrl = /^git:\/\/.+/.test(trimmedUrl);

    if (!isHttpUrl && !isSshUrl && !isGitUrl) {
      return "Please enter a valid Git repository URL (https://, git@, or git://)";
    }

    return null;
  };

  const getFullClonePath = (): string => {
    if (!cloneDestination || !cloneUrl) {
      return "";
    }
    const repoName = extractRepoNameFromUrl(cloneUrl);
    return `${cloneDestination}/${repoName}`;
  };

  const handleSelectRepo = async () => {
    // Check if we're in Electron
    if (typeof window !== "undefined" && window.electronAPI) {
      setIsLoading(true);
      try {
        const result = await window.electronAPI.openFolderDialog();
        if (result.success) {
          onSelectRepo(result.path);
          toast.success(`Repository selected: ${result.path}`);
        } else if (result.success === false && result.error) {
          toast.error(result.error);
        }
        // If error is null, user canceled - no need to show anything
      } catch (error) {
        console.error("Error selecting folder:", error);
        toast.error("Failed to select repository folder");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Fallback for web version
      toast.info("Please use the Electron desktop app to select a repository");
    }
  };

  const handleCloneRepo = () => {
    setShowCloneDialog(true);
  };

  const handleCloneUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCloneUrl(value);
    // Clear error when user starts typing
    if (cloneUrlError) {
      setCloneUrlError(null);
    }
  };

  const handleSelectCloneDestination = async () => {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        const result = await window.electronAPI.selectFolderDialog();
        if (result.success) {
          setCloneDestination(result.path);
        } else if (result.success === false && result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error selecting folder:", error);
        toast.error("Failed to select folder");
      }
    } else {
      toast.info("Please use the Electron desktop app to select a folder");
    }
  };

  const performClone = async (username?: string, password?: string) => {
    setIsLoading(true);
    onCloningChange?.(true);
    const isAuthRetry = !!username || !!password; // Are we retrying with auth?

    try {
      const finalPath = getFullClonePath();
      
      // If no credentials provided, check if URL has embedded credentials
      let effectiveUsername = username;
      let effectivePassword = password;
      
      if (!isAuthRetry) {
        const embeddedCreds = extractCredentialsFromUrl(cloneUrl);
        if (embeddedCreds) {
          effectiveUsername = embeddedCreds.username;
          effectivePassword = embeddedCreds.password;
        }
      }
      
      const result = await window.ipcRenderer.invoke(
        "git:clone",
        cloneUrl,
        finalPath,
        effectiveUsername,
        effectivePassword,
        saveCredentials
      );

      if (result.success) {
        toast.success(`Repository cloned successfully: ${finalPath}`);
        setShowCloneDialog(false);
        setShowAuthDialog(false);
        setCloneUrl("");
        setCloneDestination("");
        setCloneUrlError(null);
        setAuthUsername("");
        setAuthPassword("");
        setAuthError(null);
        setSaveCredentials(true); // Reset to default
        setShowPassword(false); // Reset password visibility
        onSelectRepo(result.path);
      } else if (result.needsSshTrust) {
        // SSH host not trusted - show trust dialog
        setShowCloneDialog(false);
        setShowAuthDialog(false);
        setSshTrustHostname(result.sshHostname || "unknown");
        setShowSshTrustDialog(true);
      } else if (result.needsSsh) {
        // SSH permission error - show SSH setup dialog
        setShowCloneDialog(false);
        setShowAuthDialog(false);
        await handleSshSetup();
      } else if (result.needsAuth) {
        if (isAuthRetry) {
          // Auth failed - show error in the auth dialog
          setAuthError(
            "Authentication failed. Please check your credentials and try again."
          );
        } else {
          // First time - show auth dialog
          const host = extractHostFromUrl(cloneUrl);
          setAuthHost(host);
          setAuthError(null); // Clear any previous errors
          
          // Clear credentials for security
          setAuthUsername("");
          setAuthPassword("");
          
          // Pre-fill with embedded credentials if they exist in the URL
          const embeddedCreds = extractCredentialsFromUrl(cloneUrl);
          if (embeddedCreds) {
            setAuthUsername(embeddedCreds.username);
            setAuthPassword(embeddedCreds.password);
          }
          
          setShowAuthDialog(true);
          setShowCloneDialog(false);
        }
      } else {
        // Other errors
        if (isAuthRetry) {
          // Show error in auth dialog
          setAuthError(
            result.error ||
              "Failed to clone repository. Please check your credentials or verify the repository exists."
          );
        } else {
          toast.error(result.error || "Failed to clone repository");
        }
      }
    } catch (error) {
      console.error("Error cloning repository:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      if (isAuthRetry) {
        setAuthError(`Failed to clone repository: ${errorMsg}`);
      } else {
        toast.error(`Failed to clone repository: ${errorMsg}`);
      }
    } finally {
      setIsLoading(false);
      onCloningChange?.(false);
    }
  };

  const handleConfirmClone = async () => {
    const trimmedUrl = cloneUrl.trim();

    // Validate URL format (empty check not needed, button will be disabled)
    const error = validateCloneUrl(trimmedUrl);
    if (error) {
      setCloneUrlError(error);
      return;
    }

    // Check if SSH URL and if host is trusted
    if (isSshUrl(trimmedUrl)) {
      const hostname = extractHostFromUrl(trimmedUrl);
      try {
        const result = await window.ipcRenderer.invoke(
          "ssh:isHostTrusted",
          hostname
        );
        if (result.success && !result.isTrusted) {
          // Host not trusted - show trust dialog
          setSshTrustHostname(hostname);
          setShowSshTrustDialog(true);
          setShowCloneDialog(false);
          return;
        }
      } catch (error) {
        console.error("Error checking SSH host:", error);
        // Continue with clone anyway
      }
    }

    // Attempt clone without auth first
    performClone();
  };

  const handleConfirmAuth = () => {
    // Retry clone with credentials (button disabled if fields empty)
    performClone(authUsername, authPassword);
  };

  const handleCancelClone = () => {
    setShowCloneDialog(false);
    setCloneUrl("");
    setCloneDestination("");
    setCloneUrlError(null);
  };

  const handleCancelAuth = () => {
    setShowAuthDialog(false);
    setAuthUsername("");
    setAuthPassword("");
    setAuthError(null);
    setSaveCredentials(true); // Reset to default
    setShowPassword(false); // Reset password visibility
    // Return to clone dialog
    setShowCloneDialog(true);
  };

  const handleSshSetup = async () => {
    try {
      // Check for existing SSH keys
      const result = await window.ipcRenderer.invoke("ssh:checkKeys");
      if (result.success) {
        setSshHasExistingKeys(result.hasKeys);
        if (result.hasKeys && result.keys.length > 0) {
          // Found existing keys - pre-load the public key but stay on check screen
          const publicKeyResult = await window.ipcRenderer.invoke(
            "ssh:readPublicKey",
            result.keys[0].publicPath
          );
          if (publicKeyResult.success) {
            setSshPublicKey(publicKeyResult.content);
          }
        }
        // Always start at check screen - it will show context-aware message
        setSshStep("check");
        setShowSshDialog(true);
      } else {
        toast.error("Failed to check SSH keys");
      }
    } catch (error) {
      console.error("Error setting up SSH:", error);
      toast.error("Failed to setup SSH");
    }
  };

  const handleGenerateSshKey = async () => {
    setSshIsGenerating(true);
    try {
      const result = await window.ipcRenderer.invoke("ssh:generateKey");
      if (result.success) {
        // Read the public key
        const publicKeyResult = await window.ipcRenderer.invoke(
          "ssh:readPublicKey",
          result.publicKeyPath
        );
        if (publicKeyResult.success) {
          setSshPublicKey(publicKeyResult.content);
          setSshStep("show-key");
          toast.success("SSH key generated successfully");
        } else {
          toast.error("Failed to read generated key");
        }
      } else {
        toast.error(result.error || "Failed to generate SSH key");
      }
    } catch (error) {
      console.error("Error generating SSH key:", error);
      toast.error("Failed to generate SSH key");
    } finally {
      setSshIsGenerating(false);
    }
  };

  const handleUseExistingKey = () => {
    setSshStep("show-key");
  };

  const handleCopySshKey = () => {
    navigator.clipboard.writeText(sshPublicKey);
    toast.success("SSH public key copied to clipboard");
  };

  const handleRetryClone = () => {
    setShowSshDialog(false);
    // Retry the clone operation
    performClone();
  };

  const handleCancelSshSetup = () => {
    setShowSshDialog(false);
    setSshStep("check");
    setSshPublicKey("");
    setSshHasExistingKeys(false);
    // Return to clone dialog
    setShowCloneDialog(true);
  };

  const handleTrustHost = async () => {
    setSshIsTrusting(true);
    try {
      const result = await window.ipcRenderer.invoke(
        "ssh:trustHost",
        sshTrustHostname
      );
      if (result.success) {
        toast.success(`Host ${sshTrustHostname} added to known hosts`);
        setShowSshTrustDialog(false);
        // Retry clone
        performClone();
      } else {
        toast.error(result.error || "Failed to trust host");
      }
    } catch (error) {
      console.error("Error trusting host:", error);
      toast.error("Failed to trust host");
    } finally {
      setSshIsTrusting(false);
    }
  };

  const handleCancelTrustHost = () => {
    setShowSshTrustDialog(false);
    setSshTrustHostname("");
    // Return to clone dialog
    setShowCloneDialog(true);
  };

  const handleCreateRepo = async () => {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        const result = await window.electronAPI.selectFolderDialog();
        if (result.success) {
          setSelectedParentPath(result.path);
          setShowCreateDialog(true);
        } else if (result.success === false && result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error selecting folder:", error);
        toast.error("Failed to select folder");
      }
    } else {
      toast.info("Please use the Electron desktop app to create a repository");
    }
  };

  const handleRepoNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRepoName(value);
    // Clear error when user starts typing
    if (repoNameError) {
      setRepoNameError(null);
    }
  };

  const handleConfirmCreate = async () => {
    const trimmedName = repoName.trim();
    const error = validateRepoName(trimmedName);

    if (error) {
      setRepoNameError(error);
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.ipcRenderer.invoke(
        "git:createRepository",
        selectedParentPath,
        trimmedName
      );

      if (result.success) {
        toast.success(`Repository created: ${result.path}`);
        setShowCreateDialog(false);
        setRepoName("");
        setRepoNameError(null);
        onSelectRepo(result.path);
      } else {
        toast.error(result.error || "Failed to create repository");
      }
    } catch (error) {
      console.error("Error creating repository:", error);
      toast.error(
        `Failed to create repository: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateDialog(false);
    setRepoName("");
    setRepoNameError(null);
    setSelectedParentPath("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-4xl p-12 text-center relative">
        {onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        <h1 className="mb-4 text-3xl font-bold text-foreground">
          Welcome to NeatGit
        </h1>
        <p className="mb-12 text-muted-foreground">
          Choose how you'd like to get started with your repository
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Open Repository */}
          <Card
            className="p-6 hover:border-primary transition-colors cursor-pointer flex flex-col"
            onClick={handleSelectRepo}
          >
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <FolderOpen className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">
              Open Repository
            </h2>
            <p className="text-sm text-muted-foreground mb-4 flex-1">
              Browse and open an existing Git repository from your local machine
            </p>
            <Button
              onClick={handleSelectRepo}
              className="w-full gap-2"
              variant="outline"
              disabled={isLoading}
            >
              <FolderOpen className="h-4 w-4" />
              {isLoading ? "Opening..." : "Browse"}
            </Button>
          </Card>

          {/* Clone Repository */}
          <Card
            className="p-6 hover:border-primary transition-colors cursor-pointer flex flex-col"
            onClick={handleCloneRepo}
          >
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <GitBranch className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">
              Clone Repository
            </h2>
            <p className="text-sm text-muted-foreground mb-4 flex-1">
              Clone a remote Git repository from GitHub, GitLab, or other
              sources
            </p>
            <Button
              onClick={handleCloneRepo}
              className="w-full gap-2"
              variant="outline"
            >
              <GitBranch className="h-4 w-4" />
              Clone
            </Button>
          </Card>

          {/* Create Repository */}
          <Card
            className="p-6 hover:border-primary transition-colors cursor-pointer flex flex-col"
            onClick={handleCreateRepo}
          >
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <FolderPlus className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">
              Create Repository
            </h2>
            <p className="text-sm text-muted-foreground mb-4 flex-1">
              Initialize a new Git repository in an existing or new folder
            </p>
            <Button
              onClick={handleCreateRepo}
              className="w-full gap-2"
              variant="outline"
            >
              <FolderPlus className="h-4 w-4" />
              Create
            </Button>
          </Card>
        </div>

        {onCancel && (
          <div className="flex justify-center">
            <Button onClick={onCancel} size="lg" variant="ghost">
              Cancel
            </Button>
          </div>
        )}
      </Card>

      {/* Create Repository Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                onChange={handleRepoNameChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !repoNameError) {
                    handleConfirmCreate();
                  } else if (e.key === "Escape") {
                    handleCancelCreate();
                  }
                }}
                className={repoNameError ? "border-destructive" : ""}
                autoFocus
              />
              {repoNameError && (
                <p className="text-sm text-destructive">{repoNameError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCreate}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Repository"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Repository Dialog */}
      <Dialog
        open={showCloneDialog}
        onOpenChange={(open) => {
          if (!isLoading) {
            setShowCloneDialog(open);
          }
        }}
      >
        <DialogContent>
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg pointer-events-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Cloning repository...
                </p>
              </div>
            </div>
          )}
          <div className={isLoading ? "pointer-events-none" : ""}>
            <DialogHeader>
              <DialogTitle>Clone Repository</DialogTitle>
              <DialogDescription>
                Enter the repository URL and select a destination folder to
                clone into.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="clone-url">Repository URL</Label>
                <Input
                  id="clone-url"
                  placeholder="https://github.com/user/repo.git"
                  value={cloneUrl}
                  onChange={handleCloneUrlChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !cloneUrlError && !isLoading) {
                      handleConfirmClone();
                    } else if (e.key === "Escape" && !isLoading) {
                      handleCancelClone();
                    }
                  }}
                  className={cloneUrlError ? "border-destructive" : ""}
                  autoFocus
                />
                {cloneUrlError && (
                  <p className="text-sm text-destructive">{cloneUrlError}</p>
                )}
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
                  <Button
                    onClick={handleSelectCloneDestination}
                    variant="outline"
                    type="button"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {cloneUrl && cloneDestination && (
                <div className="space-y-2">
                  <Label>Will clone to:</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <code className="text-sm text-foreground break-all">
                      {getFullClonePath()}
                    </code>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelClone}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmClone}
                disabled={isLoading || !cloneUrl.trim() || !cloneDestination}
              >
                {isLoading ? "Cloning..." : "Clone Repository"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Authentication Dialog */}
      <Dialog
        open={showAuthDialog}
        onOpenChange={(open) => {
          if (!isLoading) {
            setShowAuthDialog(open);
          }
        }}
      >
        <DialogContent>
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg pointer-events-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Cloning repository...
                </p>
              </div>
            </div>
          )}
          <div className={isLoading ? "pointer-events-none" : ""}>
            <DialogHeader>
              <DialogTitle>Sign in to {authHost}</DialogTitle>
              <DialogDescription>
                Authentication is required to clone this repository. Please
                enter your credentials.
              </DialogDescription>
            </DialogHeader>

            {authError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{authError}</p>
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="auth-username">Username</Label>
                <Input
                  id="auth-username"
                  value={authUsername}
                  onChange={(e) => {
                    setAuthUsername(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isLoading) {
                      handleConfirmAuth();
                    } else if (e.key === "Escape" && !isLoading) {
                      handleCancelAuth();
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-password">Password / Token</Label>
                <div className="relative">
                  <Input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={authPassword}
                    onChange={(e) => {
                      setAuthPassword(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isLoading) {
                        handleConfirmAuth();
                      } else if (e.key === "Escape" && !isLoading) {
                        handleCancelAuth();
                      }
                    }}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
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
                onClick={handleCancelAuth}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAuth}
                disabled={
                  isLoading || !authUsername.trim() || !authPassword.trim()
                }
              >
                {isLoading ? "Authenticating..." : "Sign In"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* SSH Setup Dialog */}
      <Dialog 
        open={showSshDialog} 
        onOpenChange={(open) => {
          if (!sshIsGenerating) {
            setShowSshDialog(open);
          }
        }}
      >
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
                          Your public key might not be added to the Git service
                          yet, or you may need to generate a new key.
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={handleUseExistingKey}
                          className="flex-1"
                          disabled={sshIsGenerating}
                        >
                          Show My Public Key
                        </Button>
                        <Button
                          onClick={handleGenerateSshKey}
                          variant="outline"
                          className="flex-1"
                          disabled={sshIsGenerating}
                        >
                          {sshIsGenerating
                            ? "Generating..."
                            : "Generate New Key"}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm">
                      No SSH keys found in your <code>~/.ssh</code> directory.
                    </p>
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
                    {sshHasExistingKeys
                      ? "Your existing SSH public key:"
                      : "SSH key created!"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add this public key to your Git service (GitHub, GitLab,
                    Bitbucket, etc.):
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
                  <Button
                    onClick={handleCopySshKey}
                    variant="outline"
                    className="w-full"
                  >
                    Copy to Clipboard
                  </Button>
                </div>

                <div className="space-y-2 p-4 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium">
                    How to add your SSH key:
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Copy the public key above</li>
                    <li>Go to your Git service's SSH keys settings</li>
                    <li>Add a new SSH key and paste the public key</li>
                    <li>Click "Retry Clone" below to try again</li>
                  </ol>
                </div>

                <Button onClick={handleRetryClone} className="w-full" size="lg">
                  Retry Clone
                </Button>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelSshSetup}
              disabled={sshIsGenerating}
            >
              Cancel
            </Button>
            {sshStep === "check" && !sshHasExistingKeys && (
              <Button onClick={handleGenerateSshKey} disabled={sshIsGenerating}>
                {sshIsGenerating ? "Generating..." : "Generate SSH Key"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SSH Trust Host Dialog */}
      <Dialog open={showSshTrustDialog} onOpenChange={setShowSshTrustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trust SSH Host</DialogTitle>
            <DialogDescription>
              First time connecting to this host.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm">
                The authenticity of host{" "}
                <code className="font-semibold">{sshTrustHostname}</code> can't
                be verified.
              </p>
              <p className="text-sm mt-2 text-muted-foreground">
                Do you want to trust this host and add it to your known hosts?
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelTrustHost}
              disabled={sshIsTrusting}
            >
              Cancel
            </Button>
            <Button onClick={handleTrustHost} disabled={sshIsTrusting}>
              {sshIsTrusting ? "Trusting..." : "Trust Host"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
