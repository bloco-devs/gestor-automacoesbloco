import { memo } from "react";
import { Inbox } from "lucide-react";

interface Props {
  message?: string;
}

function EmptyInbox({ message = "Sua Inbox está limpa. Bom trabalho!" }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground/60 mb-2" aria-hidden />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default memo(EmptyInbox);
