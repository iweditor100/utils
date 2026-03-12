import { useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
    useGetAvailabilityQuery,
    useGetSlotsForDateQuery,
} from "../features/users/availabilityApi";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toDateStr(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    return `${DAY_FULL[dow]}, ${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

function formatTime(t: string): string {
    const [hh, mm] = t.split(":").map(Number);
    const period = hh >= 12 ? "PM" : "AM";
    const h = hh % 12 || 12;
    return `${h}:${String(mm).padStart(2, "0")} ${period}`;
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

interface MiniCalendarProps {
    offDayDates: Set<string>;
    selectedDate: string | null;
    onSelectDate: (date: string) => void;
}

function MiniCalendar({ offDayDates, selectedDate, onSelectDate }: MiniCalendarProps) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const cells: (number | null)[] = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // pad to full rows
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 select-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <button
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="text-center">
                    <span className="font-semibold text-gray-800 dark:text-white text-sm">
                        {MONTH_NAMES[viewMonth]} {viewYear}
                    </span>
                </div>
                <button
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
                {DAY_LABELS.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />;

                    const dateStr = toDateStr(viewYear, viewMonth, day);
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;
                    const isOff = offDayDates.has(dateStr);

                    let cellClass =
                        "relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors cursor-pointer ";

                    if (isSelected) {
                        cellClass += "bg-brand-500 text-white";
                    } else if (isToday) {
                        cellClass += "ring-2 ring-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20";
                    } else {
                        cellClass += "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800";
                    }

                    return (
                        <button key={dateStr} onClick={() => onSelectDate(dateStr)} className={cellClass}>
                            {day}
                            {isOff && !isSelected && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    Off day
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" />
                    Selected
                </div>
            </div>
        </div>
    );
}

// ─── Slots Panel ──────────────────────────────────────────────────────────────

interface SlotsPanelProps {
    selectedDate: string | null;
}

function SlotsPanel({ selectedDate }: SlotsPanelProps) {
    const { data, isFetching } = useGetSlotsForDateQuery(selectedDate!, {
        skip: !selectedDate,
    });

    const result = data?.data;

    if (!selectedDate) {
        return (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex flex-col items-center justify-center text-center h-64">
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-400 dark:text-gray-500">Select a date to view available time slots</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
            <div className="mb-5">
                <h3 className="font-semibold text-gray-800 dark:text-white text-base">
                    {formatDisplayDate(selectedDate)}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Available time slots</p>
            </div>

            {isFetching ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    ))}
                </div>
            ) : result?.isOffDay ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Day Off</p>
                    {result.offDayReason && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{result.offDayReason}</p>
                    )}
                </div>
            ) : !result?.slots?.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No availability</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No time slots set for this day</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {result.slots.map((slot) => (
                        <div
                            key={slot.id}
                            className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-4 py-3"
                        >
                            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                <span>{formatTime(slot.startTime)}</span>
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                                <span>{formatTime(slot.endTime)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AvailabilityPage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const { data: availabilityData } = useGetAvailabilityQuery();

    const offDayDates = new Set(
        (availabilityData?.data?.offDays ?? []).map((d) => d.date.slice(0, 10))
    );

    return (
        <>
            <PageMeta title="Availability" description="View your availability schedule" />
            <PageBreadcrumb pageTitle="Availability" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <MiniCalendar
                    offDayDates={offDayDates}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                />
                <SlotsPanel selectedDate={selectedDate} />
            </div>
        </>
    );
};

export default AvailabilityPage;
