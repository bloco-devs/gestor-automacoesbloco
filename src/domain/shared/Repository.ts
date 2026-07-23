/**
 * Interface base para repositórios do domínio.
 * Impl concretas (SupabaseXRepository, MemoryXRepository, MockXRepository)
 * devem viver dentro de cada bounded context em `repositories/`.
 */
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(query?: Record<string, unknown>): Promise<T[]>;
  create(input: Omit<T, "id">): Promise<T>;
  update(id: ID, patch: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
}

/** Página tipada para repositórios com paginação. */
export interface Page<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}
