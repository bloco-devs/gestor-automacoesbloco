import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { contextEngine } from "@/modules/context";
import { useInboxData } from "../hooks/useInboxData";
import { selectInsights, selectMyTasks, selectPriorityItem, selectSummary } from "../selectors";
import HeroSummary from "./HeroSummary";
import PriorityCard from "./PriorityCard";
import TaskList from "./TaskList";
import RecentActivity from "./RecentActivity";
import QuickActions from "./QuickActions";
import InsightsPanel from "./InsightsPanel";
import EmptyInbox from "./EmptyInbox";
import LoadingInbox from "./LoadingInbox";

export default function InboxPage() {
  const { user } = useAuth();
  const { items, recent, loading, error } = useInboxData();

  // Context Engine: workspace=engineering, module=inbox, page=home.
  useEffect(() => {
    contextEngine.patch({
      workspace: "engineering",
      module: "inbox",
      page: "home",
      route: "/trabalho/inbox",
      breadcrumbs: [
        { label: "Trabalho" },
        { label: "Inbox", href: "/trabalho/inbox" },
      ],
    });
  }, []);

  const summary = useMemo(() => selectSummary(items), [items]);
  const priority = useMemo(() => selectPriorityItem(items), [items]);
  const myTasks = useMemo(() => selectMyTasks(items, user?.id ?? null), [items, user?.id]);
  const insights = useMemo(() => selectInsights(items), [items]);

  const displayName = (user?.nome ?? user?.email ?? "por aí").split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6 space-y-6">
      <HeroSummary name={displayName} counts={summary} />

      {loading ? (
        <LoadingInbox />
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          Não foi possível carregar a Inbox: {error.message}
        </div>
      ) : items.length === 0 ? (
        <EmptyInbox />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {priority && <PriorityCard item={priority} />}
            <TaskList items={myTasks} />
            <RecentActivity items={recent} />
          </div>
          <aside className="space-y-6" aria-label="Insights e atalhos">
            <QuickActions />
            <InsightsPanel insights={insights} />
          </aside>
        </div>
      )}
    </div>
  );
}
