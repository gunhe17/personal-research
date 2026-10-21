import type { ReactNode } from "react";
import Fold from "./Fold";
import useLeaving from "./useLeaving";

type Props<T> = { items: T[] | null; keyOf: (item: T) => string; className?: string; children: (item: T, index: number) => ReactNode };

export default function FoldList<T>({ items, keyOf, className, children }: Props<T>) {
  return useLeaving(items, keyOf).map(({ item, key, leaving, entering }, index) => (
    <Fold key={key} open={!leaving && !entering} className={className}>
      {children(item, index)}
    </Fold>
  ));
}
