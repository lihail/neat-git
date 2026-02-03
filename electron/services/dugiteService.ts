import { exec as dugiteExec } from "dugite";

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

const CLONE_TIMEOUT_MS = 300_000; // 5m
const DEFAULT_COMMAND_TIMEOUT_MS = 30_000; // 30s

// Environment variables to make git fail fast on auth instead of prompting
const FAIL_AUTH_FAST_ENV = {
  GIT_TERMINAL_PROMPT: "0",
  GIT_ASKPASS: "",
  SSH_ASKPASS: "",
  SSH_ASKPASS_REQUIRE: "never",
  GIT_SSH_COMMAND: "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new",
};

export const execGitCommand = async (
  args: string[],
  cwd: string = process.cwd(),
  customEnv?: Record<string, string>
): Promise<GitCommandResult> => {
  const command = args[0];
  const timeoutMs = command === "clone" ? CLONE_TIMEOUT_MS : DEFAULT_COMMAND_TIMEOUT_MS;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const result = await dugiteExec(args, cwd, {
      signal: abortController.signal,
      env: { ...process.env, ...FAIL_AUTH_FAST_ENV, ...customEnv },
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
