export type Edge = { from: string; to: string };

export function layered(ids: string[], edges: Edge[]): { layer: Map<string, number>; order: string[][] } {
  const next = new Map(ids.map((id) => [id, [] as string[]]));
  const forward: Edge[] = [];
  const state = new Map<string, number>();
  const visit = (id: string) => {
    state.set(id, 1);
    for (const edge of edges.filter((e) => e.from === id)) {
      if (state.get(edge.to) === 1) continue;
      forward.push(edge);
      next.get(id)!.push(edge.to);
      if (!state.has(edge.to)) visit(edge.to);
    }
    state.set(id, 2);
  };
  const targets = new Set(edges.map((edge) => edge.to));
  for (const id of [...ids.filter((id) => !targets.has(id)), ...ids]) if (!state.has(id)) visit(id);

  const layer = new Map(ids.map((id) => [id, 0]));
  for (let round = 0; round < ids.length; round += 1) {
    let changed = false;
    for (const edge of forward) {
      if (layer.get(edge.to)! < layer.get(edge.from)! + 1) {
        layer.set(edge.to, layer.get(edge.from)! + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const order: string[][] = [];
  for (const id of ids) (order[layer.get(id)!] ||= []).push(id);
  const position = (id: string) => order[layer.get(id)!].indexOf(id);
  for (let sweep = 0; sweep < 4; sweep += 1) {
    for (let depth = 1; depth < order.length; depth += 1) {
      const center = (id: string) => {
        const parents = forward.filter((edge) => edge.to === id).map((edge) => position(edge.from));
        return parents.length ? parents.reduce((a, b) => a + b, 0) / parents.length : position(id);
      };
      order[depth] = [...order[depth]].sort((a, b) => center(a) - center(b));
    }
  }

  return { layer, order };
}
