import { spawn } from "node:child_process";

export const spawnAsync = (
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || `Command exited with code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
};
