import type { PlatformCommand, PlatformRole } from "../types";

class CommandRegistry {
  private commands = new Map<string, PlatformCommand>();

  register(cmd: PlatformCommand): void {
    this.commands.set(cmd.id, cmd);
  }

  registerMany(cmds: PlatformCommand[]): void {
    for (const c of cmds) this.register(c);
  }

  unregister(id: string): void {
    this.commands.delete(id);
  }

  get(id: string): PlatformCommand | undefined {
    return this.commands.get(id);
  }

  list(): PlatformCommand[] {
    return Array.from(this.commands.values());
  }

  listFor(role?: PlatformRole | null): PlatformCommand[] {
    return this.list().filter((c) => {
      if (!c.permissions || c.permissions.length === 0) return true;
      if (!role) return false;
      return c.permissions.includes(role);
    });
  }

  clear(): void {
    this.commands.clear();
  }
}

export const commandRegistry = new CommandRegistry();
export { CommandRegistry };
