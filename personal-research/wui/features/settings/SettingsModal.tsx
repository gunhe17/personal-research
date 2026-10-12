"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Account, Provider } from "@/lib/api";
import { cx } from "@/lib/cx";
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

export default function SettingsModal({ open, account, onClose }: { open: boolean; account: Account; onClose: () => void }) {
  const [tab, setTab] = useState(() => load("settingsTab", "font", true));
  const [paned, setPaned] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const chosen = (key: string) => tab === key && !narrow;
  const { providers, statuses, errors, sheet, openSheet, saveProvider, logout, prune, closeSheet } = useProviders(open);

  useEffect(() => {
    if (open) setPaned(false);
  }, [open]);

  useEffect(() => save("settingsTab", tab, true), [tab]);

  const close = () => {
    if (sheet) closeSheet(true);
    onClose();
    prune();
  };

  const ready = (provider: Provider) => provider.methods.some((m) => usable(m, statuses[statusKey(provider, m)]));
  const current = providers.find((p) => p.id === tab);
  const pick = (next: string) => {
    setTab(next);
    setPaned(true);
  };

  return (
    <Modal open={open} onClose={close} label="Settings" className="flex h-[min(560px,90vh)] max-w-2xl">
      <nav className={cx("flex w-48 shrink-0 flex-col gap-1 border-r border-slate-100 bg-white px-2 pt-3 pb-2 max-sm:w-full max-sm:border-r-0", paned && "max-sm:hidden")}>
        <div className="mb-2 px-2 text-sm font-semibold text-slate-900">Settings</div>
        <Group icon="gear" label="General">
          <TreeRow variant="nav" label="Font" active={chosen("font")} onClick={() => pick("font")} />
        </Group>
        <Group icon="person" label="Account">
          <TreeRow variant="nav" label="Profile" active={chosen("account")} onClick={() => pick("account")} />
          {account.role === "admin" && <TreeRow variant="nav" label="Users" active={chosen("users")} onClick={() => pick("users")} />}
        </Group>
        <Group icon="chip" label="Models">
          {providers.map((provider) => (
            <TreeRow key={provider.id} variant="nav" label={provider.label} active={chosen(provider.id)} trailing={<Dot on={ready(provider)} />} onClick={() => pick(provider.id)} />
          ))}
        </Group>
        <Group icon="agent" label="Agent">
          <TreeRow variant="nav" label="Function" active={chosen("function")} onClick={() => pick("function")} />
        </Group>
      </nav>
      <IconButton icon="close" label="Close" className="absolute top-3 right-3 z-10 bg-white" onClick={close} />
      <div className={cx("min-w-0 flex-1 overflow-y-auto p-6", !paned && "max-sm:hidden")}>
        <IconButton icon="back" label="Back" className="-mt-3 -ml-2 mb-3 align-top sm:hidden" onClick={() => setPaned(false)} />
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
        ) : tab === "users" && account.role === "admin" ? (
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
