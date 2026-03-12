import { useState, useEffect, useCallback, useRef } from "react";
import flatpickr from "flatpickr";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.min.css";
import {
  useGetAvailabilityQuery,
  useUpdateScheduleMutation,
  useAddOffDayMutation,
  useRemoveOffDayMutation,
  type AvailabilitySlot,
  type OffDay,
} from "../../users/availabilityApi";

// ─── Types ────────────────────────────────────────────────────────────────────

type SlotDraft = { startTime: string; endTime: string };
type ScheduleDraft = Record<number, SlotDraft[]>;

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function buildTimeOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const period = h < 12 ? "AM" : "PM";
      const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
      opts.push({ value: `${hh}:${mm}`, label: `${dh}:${mm} ${period}` });
    }
  }
  return opts;
}

const TIME_OPTIONS = buildTimeOptions();

// ─── Utilities ────────────────────────────────────────────────────────────────

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minsToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function nextSlotDefault(existing: SlotDraft[]): SlotDraft {
  if (existing.length === 0) return { startTime: "09:00", endTime: "17:00" };
  const lastEnd = timeToMins(existing[existing.length - 1].endTime);
  const newStart = Math.min(lastEnd + 60, 23 * 60);
  const newEnd = Math.min(newStart + 60, 23 * 60 + 45);
  return { startTime: minsToTime(newStart), endTime: minsToTime(newEnd) };
}

function initDraft(slots: AvailabilitySlot[]): ScheduleDraft {
  const draft: ScheduleDraft = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [i, []])
  );
  for (const slot of slots) {
    draft[slot.dayOfWeek].push({ startTime: slot.startTime, endTime: slot.endTime });
  }
  return draft;
}

const emptyDraft = (): ScheduleDraft =>
  Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, []]));

// Returns one error string per slot index ("" = no error).
function getDayErrors(slots: SlotDraft[]): string[] {
  const errors = slots.map(() => "");

  for (let i = 0; i < slots.length; i++) {
    if (timeToMins(slots[i].startTime) >= timeToMins(slots[i].endTime)) {
      errors[i] = "Start must be before end";
    }
  }

  // Overlap check (skip slots that already have a basic error)
  const valid = slots
    .map((s, i) => ({ ...s, i }))
    .filter((_, i) => !errors[i])
    .sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

  for (let i = 0; i < valid.length - 1; i++) {
    if (timeToMins(valid[i].endTime) > timeToMins(valid[i + 1].startTime)) {
      if (!errors[valid[i].i]) errors[valid[i].i] = "Overlaps with another slot";
      if (!errors[valid[i + 1].i]) errors[valid[i + 1].i] = "Overlaps with another slot";
    }
  }

  return errors;
}

function hasAnyError(schedule: ScheduleDraft): boolean {
  return Object.values(schedule).some((slots) =>
    getDayErrors(slots).some((e) => e !== "")
  );
}

function formatOffDate(raw: string): string {
  // Parse as local date to avoid timezone-shifted display
  const [y, mo, d] = raw.split("T")[0].split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─── TimeSelect ───────────────────────────────────────────────────────────────

type TimeSelectProps = {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
};

const TimeSelect: React.FC<TimeSelectProps> = ({ value, onChange, hasError }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        "h-9 w-32 appearance-none rounded-lg border bg-white pl-3 pr-8 text-sm font-medium cursor-pointer transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400",
        "dark:bg-gray-900 dark:text-white/90",
        hasError
          ? "border-red-400 text-red-600 dark:border-red-500 dark:text-red-400"
          : "border-gray-300 text-gray-800 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500",
      ].join(" ")}
    >
      {TIME_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  </div>
);

// ─── Toggle ───────────────────────────────────────────────────────────────────

type ToggleProps = { enabled: boolean; onChange: (v: boolean) => void };

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={() => onChange(!enabled)}
    className={[
      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
      "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
      enabled ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700",
    ].join(" ")}
  >
    <span
      className={[
        "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
        enabled ? "translate-x-4" : "translate-x-0",
      ].join(" ")}
    />
  </button>
);

// ─── SlotRow ──────────────────────────────────────────────────────────────────

type SlotRowProps = {
  slot: SlotDraft;
  error: string;
  onUpdate: (field: keyof SlotDraft, value: string) => void;
  onRemove: () => void;
};

const SlotRow: React.FC<SlotRowProps> = ({ slot, error, onUpdate, onRemove }) => (
  <div>
    <div className="flex items-center gap-2">
      <TimeSelect
        value={slot.startTime}
        onChange={(v) => onUpdate("startTime", v)}
        hasError={!!error}
      />
      <span className="text-gray-400 text-xs font-medium select-none">to</span>
      <TimeSelect
        value={slot.endTime}
        onChange={(v) => onUpdate("endTime", v)}
        hasError={!!error}
      />
      <button
        type="button"
        onClick={onRemove}
        title="Remove slot"
        className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    {error && (
      <p className="mt-1 ml-0.5 text-xs font-medium text-red-500 dark:text-red-400">{error}</p>
    )}
  </div>
);

// ─── DayEditor ────────────────────────────────────────────────────────────────

type DayEditorProps = {
  name: string;
  slots: SlotDraft[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, field: keyof SlotDraft, value: string) => void;
  onToggle: (enabled: boolean) => void;
};

const DayEditor: React.FC<DayEditorProps> = ({
  name, slots, onAdd, onRemove, onUpdate, onToggle,
}) => {
  const enabled = slots.length > 0;
  const errors = getDayErrors(slots);

  return (
    <div className="flex items-start gap-4 py-4">
      {/* Left: toggle + label */}
      <div className="flex items-center gap-2.5 w-36 shrink-0 pt-1">
        <Toggle enabled={enabled} onChange={onToggle} />
        <span
          className={[
            "text-sm font-semibold",
            enabled
              ? "text-gray-800 dark:text-white"
              : "text-gray-400 dark:text-gray-500",
          ].join(" ")}
        >
          {name}
        </span>
      </div>

      {/* Right: slots */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {enabled ? (
          <>
            {slots.map((slot, idx) => (
              <SlotRow
                key={idx}
                slot={slot}
                error={errors[idx]}
                onUpdate={(field, value) => onUpdate(idx, field, value)}
                onRemove={() => onRemove(idx)}
              />
            ))}
            <button
              type="button"
              onClick={onAdd}
              className="mt-0.5 flex w-fit items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-700 dark:hover:text-brand-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add time slot
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500 pt-1">Unavailable</span>
        )}
      </div>
    </div>
  );
};

// ─── OffDaysPanel ─────────────────────────────────────────────────────────────

type OffDaysPanelProps = {
  offDays: OffDay[];
  isAdding: boolean;
  onAdd: (date: string, reason?: string) => Promise<void>;
  onRemove: (date: string) => Promise<void>;
};

const OffDaysPanel: React.FC<OffDaysPanelProps> = ({
  offDays, isAdding, onAdd, onRemove,
}) => {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<FlatpickrInstance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;
    fpRef.current = flatpickr(inputRef.current, {
      dateFormat: "Y-m-d",
      disableMobile: true,
      onChange: (dates) => {
        if (dates[0]) {
          const d = dates[0];
          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          setDate(`${y}-${mo}-${day}`);
        } else {
          setDate("");
        }
      },
    });
    return () => fpRef.current?.destroy();
  }, []);

  const handleSubmit = async () => {
    if (!date) return;
    try {
      await onAdd(date, reason || undefined);
      setDate("");
      setReason("");
      fpRef.current?.clear();
    } catch {
      // error logged by parent
    }
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Off Days</h4>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            readOnly
            placeholder="Pick a date"
            className="h-9 w-40 cursor-pointer rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>
        <input
          type="text"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-9 flex-1 min-w-[160px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
        />
        <button
          onClick={handleSubmit}
          disabled={!date || isAdding}
          className="h-9 px-4 bg-gray-800 hover:bg-gray-900 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 shrink-0"
        >
          {isAdding ? "Adding…" : "Add"}
        </button>
      </div>

      {offDays.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {offDays.map((od) => (
            <li
              key={od.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-sm"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400/70 shrink-0" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {formatOffDate(od.date)}
                </span>
              </span>
              {od.reason && (
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  — {od.reason}
                </span>
              )}
              <button
                onClick={() => onRemove(od.date)}
                title="Remove"
                className="ml-auto shrink-0 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">No off days scheduled.</p>
      )}
    </div>
  );
};

// ─── AvailabilityEditor ───────────────────────────────────────────────────────

export const AvailabilityEditor: React.FC = () => {
  const { data: availabilityData } = useGetAvailabilityQuery();
  const [updateSchedule, { isLoading: isSaving }] = useUpdateScheduleMutation();
  const [addOffDay, { isLoading: isAddingOffDay }] = useAddOffDayMutation();
  const [removeOffDay] = useRemoveOffDayMutation();

  const [schedule, setSchedule] = useState<ScheduleDraft>(emptyDraft);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    if (availabilityData?.data?.slots) {
      setSchedule(initDraft(availabilityData.data.slots));
    }
  }, [availabilityData]);

  const addSlot = (day: number) =>
    setSchedule((prev) => ({
      ...prev,
      [day]: [...prev[day], nextSlotDefault(prev[day])],
    }));

  const removeSlot = (day: number, idx: number) =>
    setSchedule((prev) => ({ ...prev, [day]: prev[day].filter((_, i) => i !== idx) }));

  const updateSlot = (day: number, idx: number, field: keyof SlotDraft, value: string) =>
    setSchedule((prev) => {
      const updated = [...prev[day]];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, [day]: updated };
    });

  const toggleDay = (day: number, enabled: boolean) =>
    setSchedule((prev) => ({
      ...prev,
      [day]: enabled ? [nextSlotDefault(prev[day])] : [],
    }));

  const handleSave = useCallback(async () => {
    if (hasAnyError(schedule)) return;
    const slots = Object.entries(schedule).flatMap(([day, daySlots]) =>
      daySlots.map((s) => ({
        dayOfWeek: Number(day),
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    );
    try {
      await updateSchedule(slots).unwrap();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("Failed to save schedule", err);
    }
  }, [schedule, updateSchedule]);

  const handleAddOffDay = useCallback(
    async (date: string, reason?: string) => {
      try {
        await addOffDay({ date, reason }).unwrap();
      } catch (err) {
        console.error("Failed to add off day", err);
        throw err;
      }
    },
    [addOffDay]
  );

  const handleRemoveOffDay = useCallback(
    async (date: string) => {
      try {
        await removeOffDay(date.split("T")[0]).unwrap();
      } catch (err) {
        console.error("Failed to remove off day", err);
      }
    },
    [removeOffDay]
  );

  const anyError = hasAnyError(schedule);
  const offDays = availabilityData?.data?.offDays ?? [];

  return (
    <div className="space-y-8">
      {/* ── Weekly Schedule ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">
              Weekly Schedule
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Set the times you're available each week.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || anyError}
            className={[
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 shrink-0",
              saveStatus === "saved"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-brand-500 hover:bg-brand-600 text-white",
            ].join(" ")}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : saveStatus === "saved" ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>

        {anyError && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-medium text-red-600 dark:text-red-400">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Fix the highlighted errors before saving.
          </div>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 divide-y divide-gray-100 dark:divide-gray-800 px-4">
          {DAY_NAMES.map((name, day) => (
            <DayEditor
              key={day}
              name={name}
              slots={schedule[day]}
              onAdd={() => addSlot(day)}
              onRemove={(idx) => removeSlot(day, idx)}
              onUpdate={(idx, field, value) => updateSlot(day, idx, field, value)}
              onToggle={(enabled) => toggleDay(day, enabled)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700/60" />

      {/* ── Off Days ── */}
      <OffDaysPanel
        offDays={offDays}
        isAdding={isAddingOffDay}
        onAdd={handleAddOffDay}
        onRemove={handleRemoveOffDay}
      />

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 pt-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-400/50 border border-green-300/50" />
          Available hours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-400/50 border border-red-300/50" />
          Off day
        </span>
      </div>
    </div>
  );
};
