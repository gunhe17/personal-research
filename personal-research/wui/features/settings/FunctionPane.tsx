"use client";

import { useEffect, useState } from "react";
import { api, type Skill } from "@/lib/api";
import Icon from "@/ui/Icon";
import SectionHeader from "@/ui/SectionHeader";
import Skeleton from "@/ui/Skeleton";
import SettingsPage from "./SettingsPage";

export default function FunctionPane() {
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.skills().then((data) => setSkills(data.items), (failure) => setError(failure.message));
  }, []);

  return (
    <SettingsPage title="Function">
      <section>
        <SectionHeader title="Functions" count={skills?.length} className="mb-2" />
        {error && <p className="enter-fade text-[12px] text-red-600">{error}</p>}
        {!skills && !error && (
          <ul className="grid gap-2">
            {["w-24", "w-32", "w-20"].map((width) => (
              <li key={width} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <Skeleton lines={[width, "w-full", "w-3/5"]} className="min-w-0 flex-1 pt-1" />
              </li>
            ))}
          </ul>
        )}
        {skills && (
          <ul className="enter-fade grid gap-2">
            {skills.map((skill) => (
              <li key={skill.name} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ice text-apple-link">
                  <Icon name="function" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="font-mono text-[13px] text-slate-900">{skill.name}</div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{skill.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SettingsPage>
  );
}
