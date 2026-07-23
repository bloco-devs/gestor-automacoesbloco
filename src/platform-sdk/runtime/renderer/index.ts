import type {
  ExtensionPointId,
  PluginCommand,
  PluginWidget,
} from "../../types";

export interface RegisteredWidget extends PluginWidget {
  pluginId: string;
}
export interface RegisteredCommand extends PluginCommand {
  pluginId: string;
}
export interface RegisteredSidebarItem {
  pluginId: string;
  id: string;
  label: string;
  path?: string;
  icon?: string;
}

type Listener = () => void;

/**
 * Renderer — registro de widgets, commands e sidebar items.
 * Nesta feature apenas mantém os registros; hosts reais consumirão
 * em v2.0 via hooks do SDK.
 */
export class PluginRenderer {
  private widgets = new Map<string, RegisteredWidget>();
  private commands = new Map<string, RegisteredCommand>();
  private sidebar = new Map<string, RegisteredSidebarItem>();
  private listeners = new Set<Listener>();

  registerWidget(w: RegisteredWidget): void {
    this.widgets.set(`${w.pluginId}:${w.id}`, w);
    this.emit();
  }
  registerCommand(c: RegisteredCommand): void {
    this.commands.set(`${c.pluginId}:${c.id}`, c);
    this.emit();
  }
  registerSidebarItem(s: RegisteredSidebarItem): void {
    this.sidebar.set(`${s.pluginId}:${s.id}`, s);
    this.emit();
  }

  unregisterPlugin(pluginId: string): void {
    for (const k of Array.from(this.widgets.keys())) {
      if (k.startsWith(`${pluginId}:`)) this.widgets.delete(k);
    }
    for (const k of Array.from(this.commands.keys())) {
      if (k.startsWith(`${pluginId}:`)) this.commands.delete(k);
    }
    for (const k of Array.from(this.sidebar.keys())) {
      if (k.startsWith(`${pluginId}:`)) this.sidebar.delete(k);
    }
    this.emit();
  }

  listWidgets(slot?: ExtensionPointId): RegisteredWidget[] {
    const arr = Array.from(this.widgets.values());
    return (slot ? arr.filter((w) => w.slot === slot) : arr).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
  }
  listCommands(): RegisteredCommand[] {
    return Array.from(this.commands.values());
  }
  listSidebarItems(): RegisteredSidebarItem[] {
    return Array.from(this.sidebar.values());
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  private emit() {
    for (const l of this.listeners) l();
  }

  __resetForTests() {
    this.widgets.clear();
    this.commands.clear();
    this.sidebar.clear();
    this.emit();
  }
}

export const platformRenderer = new PluginRenderer();
