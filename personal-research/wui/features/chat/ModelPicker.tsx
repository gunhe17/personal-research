"use client";

import { useEffect, useState } from "react";
import { api, type ModelCatalog, type ModelChoice } from "@/lib/api";
import { listen } from "@/lib/events";
import { load, save } from "@/lib/storage";
import { MenuItem } from "@/ui/Menu";
import MenuButton from "@/ui/MenuButton";

export function useModel(): [ModelCatalog | null | undefined, ModelChoice | null, (next: ModelChoice) => void] {
  const [catalog, setCatalog] = useState<ModelCatalog | null>();
  const [choice, setChoice] = useState<ModelChoice | null>(null);

  useEffect(() => {
    const fetchCatalog = () => api.models().then((data) => {
      setCatalog(data);
      const saved = load<ModelChoice | null>("model", null);
      const provider = data.providers.find((p) => p.id === saved?.provider);
      setChoice(provider?.models.some((m) => m.id === saved?.model) ? saved : data.default);
    }, () => setCatalog((current) => current ?? null));
    fetchCatalog();
    return listen("settings", fetchCatalog);
  }, []);

  const pick = (next: ModelChoice) => {
    setChoice(next);
    save("model", next);
  };
  return [catalog, choice, pick];
}

export default function ModelPicker({ catalog, choice, onPick }: { catalog: ModelCatalog; choice: ModelChoice; onPick: (next: ModelChoice) => void }) {
  const [open, setOpen] = useState<"provider" | "model" | null>(null);
  const provider = catalog.providers.find((p) => p.id === choice.provider) || catalog.providers[0];

  const pick = (next: ModelChoice) => {
    onPick(next);
    setOpen(null);
  };

  return (
    <>
      <MenuButton up name="provider" label={provider.label} open={open === "provider"} onToggle={() => setOpen(open === "provider" ? null : "provider")} onClose={() => setOpen(null)}>
        {catalog.providers.map((p) => (
          <MenuItem key={p.id} title={p.label} hint={`${p.models.length}개 모델`} selected={p.id === choice.provider} onPick={() => pick({ provider: p.id, model: p.id === choice.provider ? choice.model : p.model })} />
        ))}
      </MenuButton>
      <MenuButton up name="model" label={provider.models.find((m) => m.id === choice.model)?.label || choice.model} open={open === "model"} onToggle={() => setOpen(open === "model" ? null : "model")} onClose={() => setOpen(null)}>
        {provider.models.map((m) => <MenuItem key={m.id} title={m.label} hint={m.id} selected={m.id === choice.model} onPick={() => pick({ ...choice, model: m.id })} />)}
      </MenuButton>
    </>
  );
}
