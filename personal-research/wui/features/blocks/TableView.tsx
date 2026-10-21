import type { Visual } from "@/lib/api";
import Inline from "./Inline";

export default function TableView({ visual }: { visual: Extract<Visual, { type: "table" }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px] leading-relaxed">
        <thead>
          <tr>
            {visual.columns.map((column, index) => (
              <th key={index} className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap text-slate-700"><Inline text={column} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visual.rows.map((row, i) => (
            <tr key={i}>
              {visual.columns.map((_, j) => (
                <td key={j} className="border-b border-slate-100 px-3 py-2 align-top text-slate-800"><Inline text={row[j] ?? ""} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
