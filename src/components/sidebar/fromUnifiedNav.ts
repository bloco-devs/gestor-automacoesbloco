import { Sparkles } from "lucide-react";
import type { NavGroup, NavItem } from "./navGroups";
import type { NavigationItem, NavigationSchema } from "@/modules/navigation";

function toLegacyItem(item: NavigationItem): NavItem {
  const hasChildren = !!item.children?.length;
  return {
    to: hasChildren ? undefined : item.route,
    label: item.label,
    icon: item.icon ?? Sparkles,
    matchPrefix: hasChildren ? item.route : undefined,
    children: item.children?.map(toLegacyItem),
  };
}

/**
 * Converte um `NavigationSchema` (FEATURE 026.1 — enxuto, por persona) para o
 * formato `NavGroup[]` legado, para reaproveitar `SidebarGroupsNav` e
 * `SidebarBreadcrumb` já existentes (resize, tour, badge de pendências,
 * breadcrumb automático) sem reescrevê-los do zero.
 *
 * Isso é o que liga o registry/glossário unificados (que já existiam no
 * código, mas nunca tinham sido usados) ao sidebar real do produto.
 */
export function fromUnifiedNav(schema: NavigationSchema): NavGroup[] {
  return schema.groups.map((group) => ({
    id: group.id,
    label: group.label,
    icon: group.icon ?? Sparkles,
    items: group.items.filter((i) => !i.hidden).map(toLegacyItem),
  }));
}
