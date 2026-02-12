import { useEffect } from "react";
import { toast } from "sonner";
import { usePlatform } from "./usePlatform";

export const WINDOWS_AUTH_HINT_DELAY_MS = 3000;
const AUTH_TOAST_DURATION_MS = 10_000;

/**
 * On Windows, shows a delayed toast hinting that a sign-in window
 * may appear during remote Git operations (fetch, push, pull).
 * The toast only fires if the operation is still running after the delay,
 * filtering out fast operations where credentials are already cached
 */
export const useWindowsAuthDialogToast = (isRemoteOperationActive: boolean) => {
  const { isWindows } = usePlatform();

  useEffect(() => {
    if (!isRemoteOperationActive || !isWindows) {
      return;
    }

    const timer = setTimeout(() => {
      toast("A sign-in window may appear", {
        description: "Please complete authentication to continue.",
        duration: AUTH_TOAST_DURATION_MS,
      });
    }, WINDOWS_AUTH_HINT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isRemoteOperationActive, isWindows]);
};
