export class Storage<T> {
  private store = new Map<string, T>();

  public add(id: string, entity: T) {
    const stored = this.store.get(id);

    this.store.set(id, stored ? { ...stored, ...entity } : entity);
  }

  public get(id: string): T | undefined {
    return this.store.get(id);
  }
}
