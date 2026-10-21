import { Fragment } from "react";
import { pieces } from "@/lib/math";

export default function Inline({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) return <code key={index}>{part.slice(1, -1)}</code>;
    return (
      <Fragment key={index}>
        {pieces(part).map((piece, inner) =>
          piece.math ? (
            <span key={inner} className={piece.display ? "math-display" : undefined} dangerouslySetInnerHTML={{ __html: piece.html }} />
          ) : (
            piece.text.split(/(\*\*[^*]+\*\*)/g).map((bit, deep) =>
              bit.startsWith("**") && bit.endsWith("**") && bit.length > 4 ? <strong key={`${inner}:${deep}`}>{bit.slice(2, -2)}</strong> : <Fragment key={`${inner}:${deep}`}>{bit}</Fragment>,
            )
          ),
        )}
      </Fragment>
    );
  });
}
