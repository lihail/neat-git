import { Fragment, useState } from "react";
import { X, Plus, Download, Upload, RefreshCw, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface RepoTab {
  id: string;
  path: string;
  name: string;
}

interface RepoTabsProps {
  tabs: RepoTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onReorderTabs: (newTabs: RepoTab[]) => void;
  onOpenNewRepo: () => void;
  onStash?: () => void;
  onFetch?: () => void;
  onPull?: () => void;
  onPush?: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
  isPulling?: boolean;
  isPushing?: boolean;
}

export const RepoTabs = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onReorderTabs,
  onOpenNewRepo,
  onStash,
  onFetch,
  onPull,
  onPush,
  isLoading = false,
  isFetching = false,
  isPulling = false,
  isPushing = false,
}: RepoTabsProps) => {
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    tabId: string
  ) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", tabId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (tabId: string) => {
    setDragOverTabId(tabId);
  };

  const handleDragLeave = () => {
    setDragOverTabId(null);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    dropTabId: string
  ) => {
    e.preventDefault();

    if (!draggedTabId || draggedTabId === dropTabId) {
      setDraggedTabId(null);
      setDragOverTabId(null);
      return;
    }

    const draggedIndex = tabs.findIndex((tab) => tab.id === draggedTabId);
    const dropIndex = tabs.findIndex((tab) => tab.id === dropTabId);

    if (draggedIndex === -1 || dropIndex === -1) {
      setDraggedTabId(null);
      setDragOverTabId(null);
      return;
    }

    const newTabs = [...tabs];
    const [draggedTab] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(dropIndex, 0, draggedTab);

    onReorderTabs(newTabs);
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  return (
    <div className="flex items-end border-b border-border bg-muted/30 p-2">
      <TooltipProvider>
        <ScrollArea className="flex-1 [&>div]:!pb-0">
          <div className="flex items-end gap-2">
            {tabs.map((tab, index) => (
              <Fragment key={tab.id}>
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <div
                      draggable={!isLoading}
                      onDragStart={(e) =>
                        !isLoading && handleDragStart(e, tab.id)
                      }
                      onDragOver={!isLoading ? handleDragOver : undefined}
                      onDragEnter={() => !isLoading && handleDragEnter(tab.id)}
                      onDragLeave={!isLoading ? handleDragLeave : undefined}
                      onDrop={(e) => !isLoading && handleDrop(e, tab.id)}
                      onDragEnd={!isLoading ? handleDragEnd : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 px-4 py-3 text-sm transition-all min-w-[140px]",
                        "rounded-lg",
                        activeTabId === tab.id
                          ? "bg-transparent text-foreground"
                          : "bg-transparent text-muted-foreground hover:bg-muted/50",
                        draggedTabId === tab.id && "opacity-50",
                        dragOverTabId === tab.id && "bg-muted",
                        isLoading
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer"
                      )}
                      onClick={() => !isLoading && onSelectTab(tab.id)}
                    >
                      <span
                        className={cn(
                          "font-medium truncate",
                          activeTabId === tab.id && "font-semibold"
                        )}
                      >
                        {tab.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isLoading) onCloseTab(tab.id);
                        }}
                        disabled={isLoading}
                        className="rounded-full p-1 transition-all hover:bg-destructive/20 hover:text-destructive ml-auto flex-shrink-0 opacity-0 group-hover:opacity-70 group-hover:hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {activeTabId === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-md">
                    <p className="font-mono text-xs break-all">{tab.path}</p>
                  </TooltipContent>
                </Tooltip>
                {index < tabs.length - 1 && (
                  <div className="h-10 w-px bg-border self-center" />
                )}
              </Fragment>
            ))}
            <div className="h-10 w-px bg-border self-center" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenNewRepo}
                  disabled={isLoading}
                  className="flex-shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Open Repository</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <ScrollBar
            orientation="horizontal"
            className="absolute bottom-0 left-0 right-0"
          />
        </ScrollArea>

        {/* Separator */}
        <div className="h-10 w-px bg-border self-center mx-2 flex-shrink-0" />

        {/* Git Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-1 w-16 text-foreground"
            onClick={onFetch}
            disabled={isLoading || isFetching || isPulling || isPushing}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            <span className="text-[10px]">Fetch</span>
          </Button>

          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-1 w-16 text-foreground"
            onClick={onPull}
            disabled={isLoading || isFetching || isPulling || isPushing}
          >
            <Download className={cn("h-4 w-4", isPulling && "animate-bounce")} />
            <span className="text-[10px]">Pull</span>
          </Button>

          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-1 w-16 text-foreground"
            onClick={onPush}
            disabled={isLoading || isFetching || isPulling || isPushing}
          >
            <Upload className={cn("h-4 w-4", isPushing && "animate-pulse")} />
            <span className="text-[10px]">Push</span>
          </Button>

          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-1 w-16 text-foreground"
            onClick={onStash}
            disabled={isLoading}
          >
            <Archive className="h-4 w-4" />
            <span className="text-[10px]">Stash</span>
          </Button>
        </div>
      </TooltipProvider>
    </div>
  );
};
