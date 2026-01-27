import { FolderOpen, X, GitBranch, FolderPlus } from "lucide-react";
import { LoadingOverlay } from "./LoadingOverlay";
import { AuthDialog } from "./AuthDialog";
import { SshSetupDialog } from "./SshSetupDialog";
import { SshTrustHostDialog } from "./SshTrustHostDialog";
import { CreateRepoDialog } from "./CreateRepoDialog";
import { CloneRepoDialog } from "./CloneRepoDialog";
import { RepoActionCard } from "./RepoActionCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "@/components/ui/toaster";
import {
  validateRepoName,
  extractCredentialsFromUrl,
  extractHostFromUrl,
  isSshUrl,
  validateCloneUrl,
  getFullClonePath,
} from "@/lib/utils";
import packageJson from "../../../package.json";

interface RepoSelectorProps {
  onSelectRepo: (path: string) => void;
  onCancel?: () => void;
}

export const RepoSelector = ({ onSelectRepo, onCancel }: RepoSelectorProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [initialUsername, setInitialUsername] = useState("");
  const [initialPassword, setInitialPassword] = useState("");

  // SSH setup state
  const [showSshDialog, setShowSshDialog] = useState(false);
  const [sshStep, setSshStep] = useState<"check" | "generate" | "show-key">("check");
  const [sshHasExistingKeys, setSshHasExistingKeys] = useState(false);
  const [sshPublicKey, setSshPublicKey] = useState("");
  const [sshIsGenerating, setSshIsGenerating] = useState(false);

  // SSH trust host state
  const [showSshTrustDialog, setShowSshTrustDialog] = useState(false);
  const [sshTrustHostname, setSshTrustHostname] = useState("");
  const [sshIsTrusting, setSshIsTrusting] = useState(false);

  const handleSelectRepo = async () => {
    if (typeof window !== "undefined" && window.electronAPI) {
      setIsLoading(true);
      try {
        const result = await window.electronAPI.openSelectGitRepositoryFolderDialog();
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
    if (cloneUrlError) {
      setCloneUrlError(null);
    }
  };

  const handleSelectCloneDestination = async () => {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        const result = await window.electronAPI.openSelectParentFolderDialog();
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

  const performClone = async (
    username?: string,
    password?: string,
    saveCredentials: boolean = true
  ) => {
    setIsLoading(true);
    setIsCloning(true);
    const isAuthRetry = !!username || !!password;

    try {
      const finalPath = getFullClonePath(cloneDestination, cloneUrl);

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

      const result = await window.electronAPI.clone(
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
        setAuthError(null);
        setInitialUsername("");
        setInitialPassword("");
        onSelectRepo(result.path);
      } else if (result.needsSshTrust) {
        setShowCloneDialog(false);
        setShowAuthDialog(false);
        setSshTrustHostname(result.sshHostname || "unknown");
        setShowSshTrustDialog(true);
      } else if (result.needsSsh) {
        setShowCloneDialog(false);
        setShowAuthDialog(false);
        await handleSshSetup();
      } else if (result.needsAuth) {
        if (isAuthRetry) {
          setAuthError("Authentication failed. Please check your credentials and try again.");
        } else {
          // First time - show auth dialog
          const host = extractHostFromUrl(cloneUrl);
          setAuthHost(host);
          setAuthError(null); // Clear any previous errors

          // Pre-fill with embedded credentials if they exist in the URL
          const embeddedCreds = extractCredentialsFromUrl(cloneUrl);
          if (embeddedCreds) {
            setInitialUsername(embeddedCreds.username);
            setInitialPassword(embeddedCreds.password);
          } else {
            setInitialUsername("");
            setInitialPassword("");
          }

          setShowAuthDialog(true);
          setShowCloneDialog(false);
        }
      } else {
        // Other errors
        if (isAuthRetry) {
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
      setIsCloning(false);
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
        const result = await window.electronAPI.isHostTrusted(hostname);
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

  const handleConfirmAuth = async (username: string, password: string) => {
    // Retry clone with credentials
    await performClone(username, password);
  };

  const handleCancelClone = () => {
    setShowCloneDialog(false);
    setCloneUrl("");
    setCloneDestination("");
    setCloneUrlError(null);
  };

  const handleAuthDialogChange = (open: boolean) => {
    setShowAuthDialog(open);
    if (!open) {
      setAuthError(null);
      // Return to clone dialog
      setShowCloneDialog(true);
    }
  };

  const handleSshSetup = async () => {
    try {
      // Check for existing SSH keys
      const result = await window.electronAPI.findKeys();
      if (result.success) {
        setSshHasExistingKeys(result.hasKeys);
        if (result.hasKeys && result.keys.length > 0) {
          // Found existing keys - pre-load the public key but stay on check screen
          const publicKeyResult = await window.electronAPI.readPublicKey(result.keys[0].publicPath);
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
      const result = await window.electronAPI.generateKey();
      if (result.success) {
        // Read the public key
        const publicKeyResult = await window.electronAPI.readPublicKey(result.publicKeyPath);
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
      const result = await window.electronAPI.trustHost(sshTrustHostname);
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
        const result = await window.electronAPI.openSelectParentFolderDialog();
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
      const result = await window.electronAPI.createRepository(selectedParentPath, trimmedName);

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
      toast.error("Failed to create repository", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
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
    <div className="relative h-screen w-full">
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
          <h1 className="mb-4 text-3xl font-bold text-foreground">Welcome to NeatGit</h1>
          <p className="mb-12 text-muted-foreground">
            Choose how you'd like to get started with your repository
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <RepoActionCard
              icon={FolderOpen}
              title="Open Repository"
              description="Browse and open an existing Git repository from your local machine"
              buttonText="Browse"
              buttonLoadingText="Opening..."
              isLoading={isLoading}
              onClick={handleSelectRepo}
            />
            <RepoActionCard
              icon={GitBranch}
              title="Clone Repository"
              description="Clone a remote Git repository from GitHub, GitLab, Bitbucket, or other sources"
              buttonText="Clone"
              onClick={handleCloneRepo}
            />
            <RepoActionCard
              icon={FolderPlus}
              title="Create Repository"
              description="Initialize a new Git repository in an existing or new folder"
              buttonText="Create"
              onClick={handleCreateRepo}
            />
          </div>

          {onCancel && (
            <div className="flex justify-center">
              <Button onClick={onCancel} size="lg" variant="ghost">
                Cancel
              </Button>
            </div>
          )}
        </Card>

        <CreateRepoDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          selectedParentPath={selectedParentPath}
          repoName={repoName}
          repoNameError={repoNameError}
          isLoading={isLoading}
          onRepoNameChange={handleRepoNameChange}
          onConfirm={handleConfirmCreate}
          onCancel={handleCancelCreate}
        />

        <CloneRepoDialog
          open={showCloneDialog}
          onOpenChange={setShowCloneDialog}
          cloneUrl={cloneUrl}
          cloneDestination={cloneDestination}
          cloneUrlError={cloneUrlError}
          isLoading={isLoading}
          fullClonePath={getFullClonePath(cloneDestination, cloneUrl)}
          onCloneUrlChange={handleCloneUrlChange}
          onSelectDestination={handleSelectCloneDestination}
          onConfirm={handleConfirmClone}
          onCancel={handleCancelClone}
        />

        <AuthDialog
          open={showAuthDialog}
          onOpenChange={handleAuthDialogChange}
          isLoading={isLoading}
          loadingMessage="Cloning repository..."
          title={`Sign in to ${authHost}`}
          description="Authentication is required to clone this repository. Please enter your credentials."
          initialUsername={initialUsername}
          initialPassword={initialPassword}
          onConfirm={handleConfirmAuth}
          error={authError}
        />

        <SshSetupDialog
          open={showSshDialog}
          onOpenChange={setShowSshDialog}
          sshStep={sshStep}
          sshHasExistingKeys={sshHasExistingKeys}
          sshPublicKey={sshPublicKey}
          sshIsGenerating={sshIsGenerating}
          onUseExistingKey={handleUseExistingKey}
          onGenerateSshKey={handleGenerateSshKey}
          onCopySshKey={handleCopySshKey}
          onRetryClone={handleRetryClone}
          onCancel={handleCancelSshSetup}
        />

        <SshTrustHostDialog
          open={showSshTrustDialog}
          onOpenChange={setShowSshTrustDialog}
          hostname={sshTrustHostname}
          isTrusting={sshIsTrusting}
          onTrust={handleTrustHost}
          onCancel={handleCancelTrustHost}
        />

        {isCloning && <LoadingOverlay message="Cloning repository..." />}
      </div>
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60">
        NeatGit v{packageJson.version}
      </p>
    </div>
  );
};
