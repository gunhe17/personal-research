import type { MessageContext, Rich } from "@/lib/api";
import { mathHtml } from "@/lib/math";
import Inline from "./Inline";
import Playground from "./Playground";
import VisualBlock from "./VisualBlock";

export type Scene = { context: MessageContext; nonce: number };

type Props = { rich: Rich; id: string; onContext?: (context: MessageContext) => void; scene?: Scene | null };

export default function Blocks({ rich, id, onContext, scene }: Props) {
  return (
    <>
      <h2><Inline text={rich.title} /></h2>
      {rich.blocks.map((block, index) => {
        const key = `${id}:${index}`;
        if (block.kind === "playground" && block.playground) {
          return (
            <Playground key={key} id={key} config={block.playground} onContext={onContext} scene={scene?.context.key === key || (!scene?.context.key && scene?.context.mode === block.playground.mode) ? scene : null}>
              {block.text && <Paragraph text={block.text} className="mt-3 font-semibold" />}
            </Playground>
          );
        }
        if (block.kind === "visual" && block.visual) return <VisualBlock key={key} visual={block.visual} caption={block.text} />;
        if (block.kind === "heading") return <h3 key={key}><Inline text={block.text} /></h3>;
        if (block.kind === "math") return <div key={key} className="math-block" dangerouslySetInnerHTML={{ __html: mathHtml(block.text, true) }} />;
        if (block.kind === "formula") return <div key={key} className="formula">{block.text}</div>;
        if (block.kind === "code") return <pre key={key} className="code-block">{block.text}</pre>;
        if (block.kind === "bullet") return <ul key={key}><li><Inline text={block.text} /></li></ul>;
        return <Paragraph key={key} text={block.text} />;
      })}
      {rich.follow_up && <Paragraph text={rich.follow_up} className="follow-up" />}
    </>
  );
}

function Paragraph({ text, className }: { text: string; className?: string }) {
  const pieces = text.split(/`{2,3}[a-z]*\s*([\s\S]*?)`{2,3}/);
  return (
    <>
      {pieces.map((piece, index) => {
        if (index % 2) return <pre key={index} className="code-block">{piece.trim()}</pre>;
        if (!piece.trim()) return null;
        return <p key={index} className={className}><Inline text={piece.trim()} /></p>;
      })}
    </>
  );
}
