interface CloneLoadingOverlayProps {
  isVisible: boolean;
}

export const CloneLoadingOverlay = ({
  isVisible,
}: CloneLoadingOverlayProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Cloning repository...</p>
      </div>
    </div>
  );
};
