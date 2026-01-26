import { exec as dugiteExec } from "dugite";

interface GitCommandResult {
  success: boolean;
  output: string;
  error: string;
}

export const execGitCommand = async (
  args: string[],
  cwd: string = process.cwd()
): Promise<GitCommandResult> => {
  const result = await dugiteExec(args, cwd);

  // git diff returns exit code 1 when there are differences, which is normal behavior
  const isDiffCommand = args[0] === "diff";
  const success = isDiffCommand ? true : result.exitCode === 0;

  return {
    success,
    output: result.stdout,
    error: result.stderr,
  };
};
