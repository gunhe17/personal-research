import type { ComponentProps } from "react";

export default function Body(props: Omit<ComponentProps<"article">, "className">) {
  return <article className="mx-auto max-w-3xl px-6 py-8 pb-16 sm:px-10" {...props} />;
}
