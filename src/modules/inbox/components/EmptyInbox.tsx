import { memo } from "react";
import { Inbox } from "lucide-react";

interface Props {
  message?: string;
}

function EmptyInbox({ message = "Sua Inbox está limpa. Bom trabalho!" }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox className="size-5 text-muted-foreground/60" aria-hidden />
      <p className="ds-caption text-muted-foreground">{message}</p>
    </div>
  );
}

export default memo(EmptyInbox);
