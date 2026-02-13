import { exec as dugiteExec } from "dugite";
import { getPlatform } from "../utils/platform";

interface GitCommandSuccess {
  success: true;
  output: string;
}

interface GitCommandFailure {
  success: false;
  output: string;
  error: {
    message: string;
    isTimeout: boolean;
  };
}

type GitCommandResult = GitCommandSuccess | GitCommandFailure;

const MAC_CLONE_TIMEOUT_MS = 300_000; // 5m
const DEFAULT_COMMAND_TIMEOUT_MS = 30_000; // 30s
const WINDOWS_AUTH_PROMPT_COMMANDS_TIMEOUT_MS = 3_600_000; // 1h
const WINDOWS_AUTH_PROMPT_COMMANDS = ["clone", "fetch", "push", "pull"];

// Environment variables that prevent from opening auth interactive prompts that would hand the Electron app. On Windows, Git Credential Manager provides a proper GUI dialog, so the app extends timeouts instead and lets the user interact with the prompt
const MAC_DISABLE_AUTH_PROMPT_ENV = {
  GIT_TERMINAL_PROMPT: "0",
  GIT_ASKPASS: "",
  SSH_ASKPASS: "",
  SSH_ASKPASS_REQUIRE: "never",
  GIT_SSH_COMMAND: "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new",
};

export const execGitCommand = async (
  args: string[],
  cwd: string = process.cwd(),
  customEnv?: Record<string, string>,
  stdin?: string
): Promise<GitCommandResult> => {
  // The command might not be the first argument, because of earlier configuration flags
  const command = args.find((arg) => WINDOWS_AUTH_PROMPT_COMMANDS.includes(arg)) || args[0];
  const platform = getPlatform();

  let timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS;

  if (platform === "mac" && command === "clone") {
    timeoutMs = MAC_CLONE_TIMEOUT_MS;
  }

  // On Windows, increase the timeout significantly for auth-related commands to let the user time to respond in the auth dialog
  if (platform === "win" && WINDOWS_AUTH_PROMPT_COMMANDS.includes(command)) {
    timeoutMs = WINDOWS_AUTH_PROMPT_COMMANDS_TIMEOUT_MS;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const env = {
      ...process.env,
      ...(platform === "mac" ? MAC_DISABLE_AUTH_PROMPT_ENV : {}),
      ...customEnv,
    };

    const result = await dugiteExec(args, cwd, {
      signal: abortController.signal,
      env,
      stdin,
    });

    // git diff returns exit code 1 when there are differences, which is normal
    const isDiffCommand = command === "diff";
    const success = isDiffCommand ? true : result.exitCode === 0;

    if (success) {
      return {
        success: true,
        output: result.stdout,
      };
    }

    return {
      success: false,
      output: result.stdout,
      error: {
        message: result.stderr,
        isTimeout: false,
      },
    };
  } catch (error) {
    // Handle abort/timeout errors
    const err = error as Error & { code?: string };
    if (err.name === "AbortError" || err.code === "ABORT_ERR") {
      return {
        success: false,
        output: "",
        error: {
          message: "The operation timed out. Please check your network connection and try again",
          isTimeout: true,
        },
      };
    }

    // Re-throw unexpected errors
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
