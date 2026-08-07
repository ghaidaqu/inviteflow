export function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="border-muted-foreground/30 border-t-foreground size-8 animate-spin rounded-full border-2" />
      </div>
    </div>
  );
}
