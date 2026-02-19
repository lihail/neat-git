import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SupportNeatGitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupportNeatGitDialog = ({ open, onOpenChange }: SupportNeatGitDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Support NeatGit</DialogTitle>
          <DialogDescription>
            Support the development by donating to the developer via Ko-fi. Thank you for
            considering a donation!
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto rounded-lg">
          <iframe
            id="kofiframe"
            src="https://ko-fi.com/lihail/?hidefeed=true&widget=true&embed=true&preview=true"
            className="w-full h-full min-h-[640px]"
            style={{ padding: "4px", background: "#FFFFFF" }}
            loading="lazy"
            title="Ko-fi donation widget"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
