import { useCallback, useEffect, useState } from "react";
import { api, type Login, type Method, type Provider } from "@/lib/api";
import { emit } from "@/lib/events";

type Sheet = { provider: Provider; method: Method };

export const statusKey = (provider: Provider, method: Method | string) => `${provider.id}:${typeof method === "string" ? method : method.id}`;

export default function useProviders(open: boolean) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Login | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const check = useCallback((list: Provider[]) => {
    for (const provider of list) {
      for (const method of provider.methods.filter((m) => m.type === "plan_key")) {
        api.loginStatus(provider.id, method.id).then((status) => setStatuses((all) => ({ ...all, [statusKey(provider, method)]: status })), () => {});
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

  const saveProvider = async (provider: Provider, values: Record<string, unknown>): Promise<Provider | null> => {
    try {
      const data = await api.editProvider(provider.id, values);
      setProviders(data.providers);
      if (values.remove) setStatuses((all) => ({ ...all, [statusKey(provider, String(values.remove))]: undefined }));
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
    await api.logoutProvider(provider.id, method.id).catch(() => null);
    if (provider.methods.length > 1) await saveProvider(provider, { remove: method.id });
    else reload();
  };

  const prune = async () => {
    for (const provider of providers) {
      let enabled = provider.methods.filter((method) => method.enabled).length;
      for (const method of provider.methods) {
        const status = statuses[statusKey(provider, method)];
        if (method.type !== "plan_key" || method.secret || !status || status.logged_in || status.pending || (method.enabled && enabled <= 1)) continue;
        await api.editProvider(provider.id, { remove: method.id }).catch(() => null);
        if (method.enabled) enabled -= 1;
      }
    }
    emit("settings");
  };

  const closeSheet = async (cancelled: boolean) => {
    if (sheet && cancelled) await api.cancelLogin(sheet.provider.id, sheet.method.id).catch(() => null);
    setSheet(null);
    reload();
  };

  return { providers, statuses, errors, sheet, openSheet: setSheet, saveProvider, logout, prune, closeSheet };
}
