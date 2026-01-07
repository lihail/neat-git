import { GitActionsPanel } from "./GitActionsPanel";
import { RepoTabsList } from "./RepoTabsList";
import { Separator } from "@/components/ui/separator";

export interface RepoTab {
  id: string;
  path: string;
  name: string;
}

interface TopBarProps {
  tabs: RepoTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onReorderTabs: (newTabs: RepoTab[]) => void;
  onOpenNewRepo: () => void;
  onCreateBranch?: (branchName: string) => void;
  onStash?: () => void;
  onFetch?: () => void;
  onPull?: () => void;
  onPush?: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
  isPulling?: boolean;
  isPushing?: boolean;
  isAnyRemoteOperationActive?: boolean;
  existingBranches?: string[];
}

export const TopBar = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onReorderTabs,
  onOpenNewRepo,
  onCreateBranch,
  onStash,
  onFetch,
  onPull,
  onPush,
  isLoading = false,
  isFetching = false,
  isPulling = false,
  isPushing = false,
  isAnyRemoteOperationActive = false,
  existingBranches = [],
}: TopBarProps) => {
  return (
    <div className="flex items-end border-b border-border bg-muted/30 p-2">
      <RepoTabsList
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onReorderTabs={onReorderTabs}
        onOpenNewRepo={onOpenNewRepo}
        isLoading={isLoading}
        isAnyRemoteOperationActive={isAnyRemoteOperationActive}
      />
      <Separator orientation="vertical" className="h-10 self-center mx-2" />
      <GitActionsPanel
        onFetch={onFetch}
        onPull={onPull}
        onPush={onPush}
        onStash={onStash}
        onCreateBranch={onCreateBranch}
        isLoading={isLoading}
        isFetching={isFetching}
        isPulling={isPulling}
        isPushing={isPushing}
        existingBranches={existingBranches}
      />
    </div>
  );
};
