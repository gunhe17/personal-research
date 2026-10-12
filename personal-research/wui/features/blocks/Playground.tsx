"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { MessageContext, PlaygroundConfig } from "@/lib/api";
import { format } from "@/lib/number";
import { load, save } from "@/lib/storage";
import Button from "@/ui/Button";
import Chart from "./Chart";
import type { Scene } from "./Blocks";

type Props = { id: string; config: PlaygroundConfig; onContext?: (context: MessageContext) => void; scene: Scene | null | undefined; children?: ReactNode };

const MODE_NAME = { loss: "손실", rate: "변화율", derivative: "미분", descent: "학습률" };

export default function Playground({ id, config, onContext, scene, children }: Props) {
  const mode = config.mode || "derivative";
  const x = config.x ?? 2;
  const y = config.y ?? 6;
  const secant = mode === "rate" || mode === "derivative";
  const tangent = mode === "derivative" || mode === "descent";
  const [state, setState] = useState(() => {
    const initial = { w: config.w ?? 2, h: config.h ?? 0.1, lr: config.learning_rate ?? 0.05, zoom: secant };
    const cached = load<{ w?: number; h?: number; lr?: number; zoom?: boolean } | null>(`pg:${id}`, null);
    if (!cached || !Number.isFinite(cached.w) || Math.abs(cached.w!) > 10 || !Number.isFinite(cached.h) || Math.abs(cached.h!) < 0.001 || Math.abs(cached.h!) > 1) return initial;
    return { w: cached.w!, h: cached.h!, zoom: Boolean(cached.zoom), lr: Number.isFinite(cached.lr) && cached.lr! >= 0.001 && cached.lr! <= 0.3 ? cached.lr! : initial.lr };
  });
  const [note, setNote] = useState("");
  const [width, setWidth] = useState(720);
  const root = useRef<HTMLElement>(null);
  const clip = useId();
  const { w, h, lr, zoom } = state;
  const loss = (v: number) => (x * v - y) ** 2;
  const grad = (v: number) => 2 * x * (x * v - y);
  const average = grad(w) + x * x * h;

  const context = (next = state): MessageContext => ({ w: next.w, h: next.h, x, y, mode, learning_rate: next.lr, view: next.zoom ? "zoom" : "full", key: id });

  const change = (patch: Partial<typeof state>) => {
    const next = { ...state, ...patch };
    setState(next);
    setNote("");
    save(`pg:${id}`, next);
    onContext?.(context(next));
  };

  useEffect(() => {
    if (!scene) return;
    const c = scene.context;
    setState((s) => ({ w: c.w ?? s.w, h: c.h ?? s.h, lr: c.learning_rate ?? s.lr, zoom: c.view === "zoom" }));
    root.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scene]);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setWidth(node.getBoundingClientRect().width < 500 ? 460 : 720));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const caption = note || (tangent ? "접선은 현재 점 근처의 변화 방향을 보여줍니다. 기울기는 이동할 거리 자체가 아니에요." : secant ? "h를 0에 가깝게 줄이며 두 점을 잇는 직선의 기울기를 관찰해 보세요." : "곡선의 높이가 손실입니다. 파라미터를 바꿔 더 낮은 곳을 찾아보세요.");

  return (
    <section ref={root} className="playground" aria-label={`${MODE_NAME[mode]} 그래프 실험`}>
      <div className="flex flex-wrap justify-between gap-2">
        <p className="m-0 text-slate-500">
          <span className="mr-2 text-[11px] font-semibold tracking-[0.08em] text-slate-800">PLAYGROUND</span>
          x={format(x)}, y={format(y)} · L(w) = (xw − y)²
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => change({ zoom: !zoom })}>{zoom ? "전체 곡선 ↗" : "현재 위치 확대 ↗"}</Button>
          <Button size="sm" onClick={() => change({ w: config.w ?? 2, h: config.h ?? 0.1 })}>초기화 ↺</Button>
        </div>
      </div>
      <div className="my-3.5 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
        <Metric title="예측" value={format(x * w)} />
        <Metric title="손실" value={format(loss(w))} />
        {tangent && <Metric title="미분값" value={format(grad(w))} />}
      </div>
      <Chart width={width} clip={clip} x={x} y={y} w={w} h={h} zoom={zoom} secant={secant} tangent={tangent} average={average} loss={loss} grad={grad} />
      <div className="my-1 mb-3 flex flex-wrap gap-4 text-[12px] text-slate-500">
        <Legend color="bg-apple" title="손실 곡선" />
        {secant && <Legend color="bg-secant" title="두 점의 할선" />}
        {tangent && <Legend color="bg-tangent" title="한 점의 접선" />}
      </div>
      <div className="grid gap-3.5">
        <div>
          <label className="flex justify-between gap-2 text-[13px]">
            파라미터 w
            <input
              type="number"
              min={-10}
              max={10}
              step={0.01}
              aria-label="파라미터 w 직접 입력"
              key={w}
              defaultValue={Number(w.toFixed(6))}
              onBlur={(event) => Number.isFinite(event.target.valueAsNumber) && change({ w: Math.max(-10, Math.min(10, event.target.valueAsNumber)) })}
              className="w-[90px] rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5"
            />
          </label>
          <input type="range" min={-10} max={10} step={0.01} value={w} aria-label="파라미터 w" onChange={(event) => change({ w: Number(event.target.value) })} />
          <div className="flex justify-between text-[11px] text-slate-400"><span>−10</span><span>학습으로 바꾸는 값</span><span>10</span></div>
        </div>
        {secant && (
          <div>
            <label className="flex justify-between gap-2 text-[13px]">두 점의 간격 |h|<output>{format(Math.abs(h))}</output></label>
            <input type="range" min={-3} max={0} step={0.01} value={Math.log10(Math.abs(h))} aria-label="변화 폭" onChange={(event) => change({ h: (h < 0 ? -1 : 1) * 10 ** Number(event.target.value) })} />
            <div className="flex justify-between text-[11px] text-slate-400"><span>0.001 · 가까이</span><span>1 · 멀리</span></div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
              {[0.5, 0.1, 0.01, 0.001].map((v) => (
                <Button key={v} size="sm" tone={Math.abs(v - Math.abs(h)) < 1e-8 ? "fill" : "line"} onClick={() => change({ h: v * (h < 0 ? -1 : 1) })}>{v}</Button>
              ))}
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={h < 0} onChange={(event) => change({ h: Math.abs(h) * (event.target.checked ? -1 : 1) })} />
                왼쪽 접근
              </label>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3.5 mb-2 rounded-lg bg-ice px-3.5 py-3 whitespace-pre-line tabular-nums">
        {secant ? (
          <>가로 변화 {format(h)} · 세로 변화 {format(average * h, 6)}{"\n"}평균 변화율 = <strong>{format(average, 5)}</strong></>
        ) : mode === "descent" ? (
          <>다음 w = {format(w)} − {format(lr)} × ({format(grad(w))}) = <strong>{format(w - lr * grad(w))}</strong></>
        ) : (
          <>예측 {format(x * w)} − 정답 {format(y)} = 오차 {format(x * w - y)}. 이 오차를 제곱하면 손실 <strong>{format(loss(w))}</strong></>
        )}
      </div>
      {mode === "descent" && (
        <div className="my-2 flex items-center gap-2">
          <span>학습률</span>
          <input
            type="number"
            min={0.001}
            max={0.3}
            step={0.001}
            aria-label="학습률"
            key={lr}
            defaultValue={lr}
            onBlur={(event) => Number.isFinite(event.target.valueAsNumber) && change({ lr: Math.max(0.001, Math.min(0.3, event.target.valueAsNumber)) })}
            className="w-20 rounded-lg border border-slate-200 px-1.5 py-0.5"
          />
          <Button
            size="sm"
            onClick={() => {
              const next = w - lr * grad(w);
              if (Math.abs(next) > 10) setNote("다음 값이 그래프의 조절 범위를 벗어납니다. 학습률을 줄여 보세요.");
              else change({ w: next });
            }}
          >
            한 번 학습하기 →
          </Button>
        </div>
      )}
      <p className="my-2 text-[13px] text-slate-500">{caption}</p>
      {onContext && <Button tone="link" onClick={() => onContext(context())}>이 장면으로 질문하기 ↗</Button>}
      {children}
    </section>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="block text-[12px] text-slate-500">{title}</span>
      <strong className="text-[20px] font-semibold tabular-nums">{value}</strong>
    </div>
  );
}

function Legend({ color, title }: { color: string; title: string }) {
  return <span><i className={`mr-1.5 inline-block h-[3px] w-4 align-middle ${color}`} />{title}</span>;
}
