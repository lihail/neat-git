import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Index } from "./pages/Index";
import { BrowserNotSupportedScreen } from "@/components/BrowserNotSupportedScreen";

const queryClient = new QueryClient();

const isElectron = Boolean(window.electronAPI);

export const App = () => {
  if (!isElectron) {
    return <BrowserNotSupportedScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Index />
      </TooltipProvider>
    </QueryClientProvider>
  );
};
