import type { SearchEntity, SearchEntityType } from "../types";

export type SearchProvider = () => SearchEntity[] | Promise<SearchEntity[]>;

class SearchRegistry {
  private staticEntities = new Map<string, SearchEntity>();
  private providers = new Map<SearchEntityType, SearchProvider>();

  register(entity: SearchEntity): void {
    this.staticEntities.set(`${entity.type}:${entity.id}`, entity);
  }

  registerMany(entities: SearchEntity[]): void {
    for (const e of entities) this.register(e);
  }

  unregister(type: SearchEntityType, id: string): void {
    this.staticEntities.delete(`${type}:${id}`);
  }

  registerProvider(type: SearchEntityType, provider: SearchProvider): void {
    this.providers.set(type, provider);
  }

  unregisterProvider(type: SearchEntityType): void {
    this.providers.delete(type);
  }

  async collect(): Promise<SearchEntity[]> {
    const dynamic = await Promise.all(
      Array.from(this.providers.values()).map(async (p) => {
        try {
          return await p();
        } catch {
          return [] as SearchEntity[];
        }
      }),
    );
    return [...this.staticEntities.values(), ...dynamic.flat()];
  }

  clear(): void {
    this.staticEntities.clear();
    this.providers.clear();
  }
}

export const searchRegistry = new SearchRegistry();
export { SearchRegistry };
