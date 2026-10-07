"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Login, type Method, type Provider } from "@/lib/api";
import { emit } from "@/lib/events";
import Dot from "@/ui/Dot";
import Icon from "@/ui/Icon";
import IconButton from "@/ui/IconButton";
import Modal from "@/ui/Modal";
import TreeRow from "@/ui/TreeRow";
import GeneralPane from "./GeneralPane";
import LoginSheet from "./LoginSheet";
import ProviderPane, { usable } from "./ProviderPane";

type Sheet = { provider: Provider; method: Method };

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState("general");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Login | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const check = useCallback((list: Provider[]) => {
    for (const provider of list) {
      for (const method of provider.methods.filter((m) => m.type === "plan_key")) {
        api.login(provider.id, method.id).then((status) => setStatuses((all) => ({ ...all, [`${provider.id}:${method.id}`]: status })), () => {});
      }
    }
  }, []);

  const reload = useCallback(() => {
    api.settings().then((data) => {
      setProviders(data.providers);
      check(data.providers);
    }, () => {});
  }, [check]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  const save = async (provider: Provider, values: Record<string, unknown>): Promise<Provider | null> => {
    try {
      const data = await api.editProvider(provider.id, values);
      setProviders(data.providers);
      if (values.remove) setStatuses((all) => ({ ...all, [`${provider.id}:${values.remove}`]: undefined }));
      check(data.providers.filter((p) => p.id === provider.id));
      setErrors((all) => ({ ...all, [provider.id]: "" }));
      emit("settings");
      return data.providers.find((p) => p.id === provider.id) || null;
    } catch (error) {
      setErrors((all) => ({ ...all, [provider.id]: (error as Error).message }));
      return null;
    }
  };

  const logout = async (provider: Provider, method: Method) => {
    await api.logout(provider.id, method.id).catch(() => null);
    reload();
  };

  const closeSheet = async (cancelled: boolean) => {
    if (sheet && cancelled) await api.cancelLogin(sheet.provider.id, sheet.method.id).catch(() => null);
    setSheet(null);
    reload();
  };

  const close = () => {
    if (sheet) closeSheet(true);
    onClose();
  };

  const ready = (provider: Provider) => provider.methods.some((m) => usable(m, statuses[`${provider.id}:${m.id}`]));
  const current = providers.find((p) => p.id === tab);

  return (
    <Modal open={open} onClose={close} label="Settings" className="flex h-[min(560px,90vh)] max-w-2xl">
      <nav className="flex w-48 shrink-0 flex-col gap-0.5 border-r border-slate-100 bg-white px-2 pt-3 pb-2 max-sm:w-36">
        <div className="mb-2 px-2 text-sm font-semibold text-slate-900">Settings</div>
        <TreeRow variant="nav" label="General" icon="gear" active={tab === "general"} onClick={() => setTab("general")} />
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-600">
          <Icon name="chip" className="h-4 w-4" />
          Models
        </div>
        <div className="mt-0.5 ml-3 flex flex-col gap-0.5 border-l border-slate-100 pl-1">
          {providers.map((provider) => (
            <TreeRow key={provider.id} variant="nav" label={provider.label} active={tab === provider.id} trailing={<Dot on={ready(provider)} />} onClick={() => setTab(provider.id)} />
          ))}
        </div>
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        <IconButton icon="close" label="Close" className="absolute top-3 right-3" onClick={close} />
        {current ? (
          <ProviderPane
            key={current.id}
            provider={current}
            statuses={Object.fromEntries(current.methods.map((m) => [m.id, statuses[`${current.id}:${m.id}`]]))}
            error={errors[current.id] || ""}
            onSave={(values) => save(current, values)}
            onLogin={(method) => setSheet({ provider: current, method })}
            onLogout={(method) => logout(current, method)}
          />
        ) : (
          <GeneralPane />
        )}
      </div>
      {sheet && (
        <LoginSheet
          provider={sheet.provider.id}
          method={sheet.method.id}
          title={`Log in to ${sheet.provider.label}${sheet.method.label === "Plan login" ? "" : ` · ${sheet.method.label}`}`}
          initial={statuses[`${sheet.provider.id}:${sheet.method.id}`]}
          onClose={closeSheet}
        />
      )}
    </Modal>
  );
}
