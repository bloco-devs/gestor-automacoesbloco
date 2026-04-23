import { useEffect, useState } from "react";
import { subscribe } from "@/lib/store";

/** Re-renderiza componentes quando o store local mudar (mock de realtime). */
export function useStoreSubscription<T>(getter: () => T): T {
  const [value, setValue] = useState<T>(() => getter());
  useEffect(() => {
    const unsub = subscribe(() => setValue(getter()));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}
