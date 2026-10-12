"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api, type Account, type Provider } from "@/lib/api";
import { load, save } from "@/lib/storage";
import Dot from "@/ui/Dot";
import Icon from "@/ui/Icon";
import IconButton from "@/ui/IconButton";
import Modal from "@/ui/Modal";
import TreeRow from "@/ui/TreeRow";
import AccountPane from "./AccountPane";
import FunctionPane from "./FunctionPane";
import UsersPane from "./UsersPane";
import FontPane from "./FontPane";
import LoginSheet from "./LoginSheet";
import { usable } from "./MethodRow";
import ProviderPane from "./ProviderPane";
import useProviders, { statusKey } from "./useProviders";

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState(() => load("settingsTab", "font", true));
  const [account, setAccount] = useState<Account | null>(null);
  const { providers, statuses, errors, sheet, openSheet, saveProvider, logout, prune, closeSheet } = useProviders(open);

  useEffect(() => {
    if (open) api.me().then(setAccount, () => {});
  }, [open]);

  useEffect(() => save("settingsTab", tab, true), [tab]);

  const close = () => {
    if (sheet) closeSheet(true);
    onClose();
    prune();
  };

  const ready = (provider: Provider) => provider.methods.some((m) => usable(m, statuses[statusKey(provider, m)]));
  const current = providers.find((p) => p.id === tab);

  return (
    <Modal open={open} onClose={close} label="Settings" className="flex h-[min(560px,90vh)] max-w-2xl">
      <nav className="flex w-48 shrink-0 flex-col gap-1 border-r border-slate-100 bg-white px-2 pt-3 pb-2 max-sm:w-36">
        <div className="mb-2 px-2 text-sm font-semibold text-slate-900">Settings</div>
        <Group icon="gear" label="General">
          <TreeRow variant="nav" label="Font" active={tab === "font"} onClick={() => setTab("font")} />
        </Group>
        <Group icon="person" label="Account">
          <TreeRow variant="nav" label="Profile" active={tab === "account"} onClick={() => setTab("account")} />
          {account?.role === "admin" && <TreeRow variant="nav" label="Users" active={tab === "users"} onClick={() => setTab("users")} />}
        </Group>
        <Group icon="chip" label="Models">
          {providers.map((provider) => (
            <TreeRow key={provider.id} variant="nav" label={provider.label} active={tab === provider.id} trailing={<Dot on={ready(provider)} />} onClick={() => setTab(provider.id)} />
          ))}
        </Group>
        <Group icon="agent" label="Agent">
          <TreeRow variant="nav" label="Function" active={tab === "function"} onClick={() => setTab("function")} />
        </Group>
      </nav>
      <IconButton icon="close" label="Close" className="absolute top-3 right-3 z-10 bg-white" onClick={close} />
      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        {current ? (
          <ProviderPane
            key={current.id}
            provider={current}
            statuses={Object.fromEntries(current.methods.map((m) => [m.id, statuses[statusKey(current, m)]]))}
            error={errors[current.id] || ""}
            onSave={(values) => saveProvider(current, values)}
            onLogin={(method) => openSheet({ provider: current, method })}
            onLogout={(method) => logout(current, method)}
          />
        ) : tab === "account" ? (
          <AccountPane account={account} />
        ) : tab === "users" && account?.role === "admin" ? (
          <UsersPane me={account.id} />
        ) : tab === "function" ? (
          <FunctionPane />
        ) : (
          <FontPane />
        )}
      </div>
      {sheet && (
        <LoginSheet
          provider={sheet.provider.id}
          method={sheet.method.id}
          title={`Log in to ${sheet.provider.label}${sheet.method.label === "Plan login" ? "" : ` · ${sheet.method.label}`}`}
          initial={statuses[statusKey(sheet.provider, sheet.method)]}
          onClose={closeSheet}
        />
      )}
    </Modal>
  );
}

function Group({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-600">
        <Icon name={icon} className="h-4 w-4" />
        {label}
      </div>
      <div className="ml-3 flex flex-col gap-1 border-l border-slate-100 pl-1">{children}</div>
    </>
  );
}
