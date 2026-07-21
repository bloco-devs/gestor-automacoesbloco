import { memo } from "react";
import { Loader2 } from "lucide-react";

function LoadingInbox() {
  return (
    <div
      className="flex items-center justify-center py-12 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      Carregando sua Inbox…
    </div>
  );
}

export default memo(LoadingInbox);
