import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

interface ListStateProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  onRetry?: () => void;
  skeleton: ReactNode;
  empty: ReactNode;
  children: ReactNode;
}

export function ListState({ loading, error, isEmpty, onRetry, skeleton, empty, children }: ListStateProps) {
  if (loading) return <>{skeleton}</>;
  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Não foi possível carregar"
        description={error}
        action={
          onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : undefined
        }
      />
    );
  }
  if (isEmpty) return <>{empty}</>;
  return <>{children}</>;
}

export default ListState;
