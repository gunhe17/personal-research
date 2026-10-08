"use client";

import { useEffect, useState } from "react";
import { api, type Skill } from "@/lib/api";
import SectionHeader from "@/ui/SectionHeader";

export default function FunctionPane() {
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.skills().then((data) => setSkills(data.items), (failure) => setError(failure.message));
  }, []);

  return (
    <div className="space-y-6">
      <h3 className="text-[21px] font-semibold tracking-tight text-slate-900">Agent</h3>
      <section>
        <SectionHeader title="Skills" count={skills?.length} className="mb-2" />
        {error && <p className="text-[12px] text-red-600">{error}</p>}
        {!skills && !error && <p className="text-[12px] text-slate-400">Loading…</p>}
        <ul className="divide-y divide-slate-100">
          {(skills || []).map((skill) => (
            <li key={skill.name} className="py-2.5">
              <div className="font-mono text-[13px] text-slate-900">{skill.name}</div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{skill.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
