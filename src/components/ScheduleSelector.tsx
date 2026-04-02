"use client";

import { useState } from "react";

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
] as const;

interface ScheduleSelectorProps {
  name?: string;
  defaultValue?: string[];
}

export default function ScheduleSelector({
  name = "target_schedule",
  defaultValue = [],
}: ScheduleSelectorProps) {
  // defaultValue から最初にデータがある曜日を見つける
  const getInitialActiveDay = () => {
    if (defaultValue.length === 0) return DAYS[0].key;
    const firstEntry = defaultValue[0];
    const dayKey = firstEntry.split("-")[0];
    return DAYS.find(d => d.key === dayKey)?.key || DAYS[0].key;
  };

  const [activeDay, setActiveDay] = useState<string>(getInitialActiveDay());
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultValue));

  const toggle = (day: string, hour: number) => {
    const key = `${day}-${hour}`;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  return (
    <div>
      {Array.from(selected).map((val) => (
        <input key={val} type="hidden" name={name} value={val} />
      ))}
      <div className="flex gap-1 mb-3">
        {DAYS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setActiveDay(d.key)}
            className={`flex-1 py-1 text-[10px] font-bold rounded border transition-all ${
              activeDay === d.key
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
          const key = `${activeDay}-${hour}`;
          const checked = selected.has(key);
          return (
            <label
              key={hour}
              className={`flex items-center justify-center py-1 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                checked
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(activeDay, hour)}
                className="sr-only"
              />
              {hour}
            </label>
          );
        })}
      </div>
    </div>
  );
}
