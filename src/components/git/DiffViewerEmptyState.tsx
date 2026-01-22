interface DiffViewerEmptyStateProps {
  message: string;
}

export const DiffViewerEmptyState = ({ message }: DiffViewerEmptyStateProps) => {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
};
