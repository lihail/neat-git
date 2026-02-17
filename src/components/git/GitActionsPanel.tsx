import { MouseEventHandler, useState } from "react";
import { Download, Upload, RefreshCw, Archive, GitBranchPlus } from "lucide-react";
import { ActionButton } from "../common/ActionButton";
import { NewBranchDialog } from "./NewBranchDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GitActionsPanelProps {
  onFetch: MouseEventHandler<HTMLButtonElement>;
  onPull: MouseEventHandler<HTMLButtonElement>;
  onPush: MouseEventHandler<HTMLButtonElement>;
  onStash: MouseEventHandler<HTMLButtonElement>;
  onCreateBranch: (branchName: string) => void;
  isLoading?: boolean;
  isFetching?: boolean;
  isPulling?: boolean;
  isPushing?: boolean;
  existingBranches?: string[];
  hasUncommittedChanges: boolean;
}

export const GitActionsPanel = ({
  onFetch,
  onPull,
  onPush,
  onStash,
  onCreateBranch,
  isLoading = false,
  isFetching = false,
  isPulling = false,
  isPushing = false,
  existingBranches = [],
  hasUncommittedChanges,
}: GitActionsPanelProps) => {
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1 flex-shrink-0">
        <ActionButton
          icon={RefreshCw}
          label="Fetch"
          onClick={onFetch}
          disabled={isLoading || isFetching || isPulling || isPushing}
          iconClassName={isFetching ? "animate-spin" : undefined}
        />

        <ActionButton
          icon={Download}
          label="Pull"
          onClick={onPull}
          disabled={isLoading || isFetching || isPulling || isPushing}
          iconClassName={isPulling ? "animate-bounce" : undefined}
        />

        <ActionButton
          icon={Upload}
          label="Push"
          onClick={onPush}
          disabled={isLoading || isFetching || isPulling || isPushing}
          iconClassName={isPushing ? "animate-bounce-up" : undefined}
        />

        {isLoading || !hasUncommittedChanges ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger disabled>
              <ActionButton icon={Archive} label="Stash" onClick={onStash} disabled />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>No changes to stash</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <ActionButton icon={Archive} label="Stash" onClick={onStash} />
        )}

        <ActionButton
          icon={GitBranchPlus}
          label="Branch"
          onClick={() => setIsCreatingBranch(true)}
          disabled={isLoading}
        />
      </div>

      <NewBranchDialog
        open={isCreatingBranch}
        onOpenChange={setIsCreatingBranch}
        onCreateBranch={onCreateBranch}
        existingBranches={existingBranches}
      />
    </>
  );
};
