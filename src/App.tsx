import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Workspace } from "./pages/Workspace";
import { BrowserNotSupportedScreen } from "@/components/common/BrowserNotSupportedScreen";
import { ThemeProvider } from "@/hooks/useTheme";

const queryClient = new QueryClient();

const isElectron = Boolean(window.electronAPI);

export const App = () => {
  if (!isElectron) {
    return <BrowserNotSupportedScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Workspace />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
