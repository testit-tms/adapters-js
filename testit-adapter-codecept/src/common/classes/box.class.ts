export class Box<T> {
  private readonly box = new Map<string, T>;

  public collectWithMerge(id: string, entity: T) {
    const collected = this.box.get(id);

    this.box.set(
      id,
      collected
        ? { ...collected, ...entity }
        : entity
    )
  }

  public get(id: string): T {
    return this.box.get(id);
  }
}