import { Card } from "@/components/ui/card";
import { Monitor } from "lucide-react";

export const BrowserNotSupportedScreen = () => (
  <div className="flex min-h-screen items-center justify-center p-8 bg-background">
    <Card className="w-full max-w-md p-8 text-center">
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-muted p-4">
          <Monitor className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>
      <h1 className="mb-3 text-2xl font-bold text-foreground">Desktop App Required</h1>
      <p className="text-muted-foreground mb-4">
        NeatGit is a desktop application and cannot run in the browser. Please open the native app
        to continue.
      </p>
      <p className="text-sm text-muted-foreground/60">
        If you haven't installed NeatGit yet, please download it from{" "}
        <a
          href="https://github.com/lihail/neat-git?tab=readme-ov-file#installation"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
        >
          the official website
        </a>
        .
      </p>
    </Card>
  </div>
);
