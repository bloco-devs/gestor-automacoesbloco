import type { NavItem, PlatformRole } from "../types";

class NavigationRegistry {
  private items = new Map<string, NavItem>();

  register(item: NavItem): void {
    this.items.set(item.id, item);
  }

  registerMany(items: NavItem[]): void {
    for (const i of items) this.register(i);
  }

  unregister(id: string): void {
    this.items.delete(id);
  }

  get(id: string): NavItem | undefined {
    return this.items.get(id);
  }

  /** Retorna a rota registrada por id. Fonte única de verdade. */
  routeOf(id: string): string | undefined {
    return this.items.get(id)?.route;
  }

  list(): NavItem[] {
    return Array.from(this.items.values());
  }

  listFor(role?: PlatformRole | null): NavItem[] {
    return this.list().filter((i) => {
      if (!i.permissions || i.permissions.length === 0) return true;
      if (!role) return false;
      return i.permissions.includes(role);
    });
  }

  clear(): void {
    this.items.clear();
  }
}

export const navigationRegistry = new NavigationRegistry();
export { NavigationRegistry };
