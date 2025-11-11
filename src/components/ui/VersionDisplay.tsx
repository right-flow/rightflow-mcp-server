const APP_VERSION = '0.2.3';

export const VersionDisplay = () => {
  return (
    <div className="fixed bottom-2 left-2 text-xs text-muted-foreground opacity-50 hover:opacity-100 transition-opacity z-50 pointer-events-none select-none">
      v{APP_VERSION}
    </div>
  );
};
