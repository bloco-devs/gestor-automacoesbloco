export function uid(prefix = "wf"): string {
  const rnd = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${rnd}`;
}
