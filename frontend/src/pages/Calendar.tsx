import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { socket } from "../lib/socket";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { DateSelectArg, EventClickArg, EventContentArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
import {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useDeleteAllEventsMutation,
} from "../features/users/calendarApi";
import { useConnectGoogleMutation, useDisconnectGoogleMutation, useGetGoogleStatusQuery, useToggleGoogleSyncMutation, useImportFromGoogleMutation, useExportToGoogleMutation } from "../features/google/googleCalendarApi";
import { useGetAvailabilityQuery } from "../features/users/availabilityApi";
import { AvailabilityEditor } from "../features/availability/components/AvailabilityEditor";

// Helper to format date for datetime-local input (YYYY-MM-DDTHH:mm)
const formatDateTimeLocal = (dateStr: string | Date) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
  return localISOTime;
};

const Calendar: React.FC = () => {
  // RTK Query Hooks
  const { data: eventsData, isLoading, refetch } = useGetEventsQuery();

  const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();
  const [deleteAllEvents, { isLoading: isDeletingAll }] = useDeleteAllEventsMutation();

  // Socket.IO
  const user = useSelector((state: any) => state.auth.user);
  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    socket.auth = { userId: user.id };
    socket.connect();

    socket.on("calendar:updated", () => {
      console.log("📅 Real-time update received!");
      refetch();
    });

    return () => {
      socket.off("calendar:updated");
      socket.disconnect();
    };
  }, [user?.id, refetch]);

  // Local Form State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [category, setCategory] = useState<"PRIMARY" | "SUCCESS" | "WARNING" | "DANGER">("PRIMARY");

  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();


  // google calendar hooks
  const [connectGoogle] = useConnectGoogleMutation();
  const { data: googleStatus, refetch: refetchGoogleStatus } = useGetGoogleStatusQuery();
  const [toggleSync, { isLoading: isToggling }] = useToggleGoogleSyncMutation();
  const [importFromGoogle, { isLoading: isImporting }] = useImportFromGoogleMutation();
  const [exportToGoogle, { isLoading: isExporting }] = useExportToGoogleMutation();
  const [disconnectGoogle, { isLoading: isDisconnecting }] = useDisconnectGoogleMutation();

  // import/export date range state
  const [importStart, setImportStart] = useState("");
  const [importEnd, setImportEnd] = useState("");
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  // Availability — only used here for calendar background events
  const { data: availabilityData } = useGetAvailabilityQuery();
  const [showAvailability, setShowAvailability] = useState(false);


  const handleConnectGoogle = async () => {
    try {
      const res = await connectGoogle().unwrap();
      window.location.href = res.data.url; // redirect to Google OAuth
    } catch (err) {
      console.error("Failed to connect Google", err);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Delete all local calendar events? This cannot be undone.")) return;
    try {
      await deleteAllEvents().unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to delete all events", err);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    try {
      await toggleSync({ enabled }).unwrap();
      refetchGoogleStatus();
    } catch (err: any) {
      const appCode = err?.data?.appCode ?? err?.appCode;
      if (appCode === 42005) {
        // Token lacks calendar scope — must reconnect to grant it
        if (confirm("Your Google token doesn't have Calendar permissions. Reconnect now?")) {
          handleConnectGoogle();
        }
        return;
      }
      console.error("Failed to toggle sync", err);
    }
  };

  const handleImport = async () => {
    try {
      await importFromGoogle({ startDate: importStart || undefined, endDate: importEnd || undefined }).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to import from Google", err);
    }
  };

  const handleExport = async () => {
    try {
      await exportToGoogle({ startDate: exportStart || undefined, endDate: exportEnd || undefined }).unwrap();
    } catch (err) {
      console.error("Failed to export to Google", err);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Disconnect Google Calendar? This will unlink all synced events.")) return;
    try {
      await disconnectGoogle().unwrap();
    } catch (err) {
      console.error("Failed to disconnect Google", err);
    }
  };

  const categories = [
    "PRIMARY", "SUCCESS", "WARNING", "DANGER"
  ] as const;

  // Map Backend DTO -> FullCalendar Events
  const calendarEvents = eventsData?.data?.events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startAt,
    end: event.endAt,
    extendedProps: { category: event.category },
    classNames: [`event-${event.category.toLowerCase()}`],
  })) || [];

  // Availability background events
  const availabilityBgEvents = availabilityData?.data
    ? [
        ...availabilityData.data.slots.map((slot) => ({
          display: "background" as const,
          daysOfWeek: [slot.dayOfWeek],
          startTime: slot.startTime,
          endTime: slot.endTime,
          color: "rgba(34, 197, 94, 0.15)",
        })),
        ...availabilityData.data.offDays.map((od) => ({
          display: "background" as const,
          start: od.date.split("T")[0],
          allDay: true,
          color: "rgba(239, 68, 68, 0.18)",
        })),
      ]
    : [];

  const allCalendarEvents = [...calendarEvents, ...availabilityBgEvents];

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // Reset form
    setSelectedEventId(null);
    setTitle("");
    setStart(formatDateTimeLocal(selectInfo.startStr));
    // Default end to +1 hour if not provided or same as start
    const endDate = selectInfo.endStr ? new Date(selectInfo.endStr) : new Date(new Date(selectInfo.startStr).getTime() + 60 * 60 * 1000);
    setEnd(formatDateTimeLocal(endDate));
    setCategory("PRIMARY");
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEventId(event.id);
    setTitle(event.title);
    setStart(formatDateTimeLocal(event.start || ""));
    setEnd(formatDateTimeLocal(event.end || ""));
    setCategory(event.extendedProps.category || "PRIMARY");
    openModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!title || !start || !end) return;

    const payload = {
      title,
      start: new Date(start).toISOString(), // Convert back to UTC ISO
      end: new Date(end).toISOString(),
      category,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    try {
      if (selectedEventId) {
        console.log("selected an event: ", selectedEventId, "with payload: ", payload);
        await updateEvent({ id: selectedEventId, body: payload }).unwrap();
      } else {
        console.log("creating an event with payload: ", payload);
        await createEvent(payload).unwrap();
      }
      refetch();
      closeModal();
    } catch (error) {
      console.error("Failed to save event", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEventId) return;
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteEvent(selectedEventId).unwrap();
        refetch();
        closeModal();
      } catch (error) {
        console.error("Failed to delete event", error);
      }
    }
  };

  return (
    <>
      <PageMeta
        title="Calendar | TailAdmin"
        description="Manage your events and schedule."
      />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar p-4">
          {/* GOOGLE SYNC UI */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Google Calendar</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {googleStatus?.data?.connected
                  ? `Connected as ${googleStatus.data.email} please make sure you are using ngrok`
                  : "Connect your Google Calendar to sync events."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!googleStatus?.data?.connected ? (
                <button
                  onClick={handleConnectGoogle}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                  </svg>
                  Connect Google
                </button>
              ) : (
                <>
                  {googleStatus.data.isSyncEnabled && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      IN SYNC
                    </span>
                  )}

                  <button
                    onClick={() => handleToggleSync(!googleStatus.data?.isSyncEnabled)}
                    disabled={isToggling}
                    className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 ${googleStatus.data.isSyncEnabled
                      ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                      : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                  >
                    {isToggling ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : googleStatus.data.isSyncEnabled ? (
                      "Disable Sync"
                    ) : (
                      "Enable Sync"
                    )}
                  </button>
                  <button
                    onClick={handleDisconnectGoogle}
                    disabled={isDisconnecting}
                    className="px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 disabled:opacity-50"
                  >
                    {isDisconnecting ? "Disconnecting..." : "Disconnect Google"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* AVAILABILITY SETTINGS */}
          <div className="mb-4">
            <button
              onClick={() => setShowAvailability((p) => !p)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700/50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Availability Settings
              <svg
                className={`w-4 h-4 ml-1 transition-transform ${showAvailability ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAvailability && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
                <AvailabilityEditor />
              </div>
            )}
          </div>

          {/* CLEAR ALL EVENTS */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20"
            >
              {isDeletingAll ? "Clearing..." : "Clear All Events"}
            </button>
          </div>

          {/* IMPORT / EXPORT PANEL — shown when connected but sync is OFF */}
          {googleStatus?.data?.connected && !googleStatus.data.isSyncEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Import from Google */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Import from Google</h4>
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    value={importStart}
                    onChange={(e) => setImportStart(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    placeholder="Start date"
                  />
                  <input
                    type="date"
                    value={importEnd}
                    min={importStart}
                    onChange={(e) => setImportEnd(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    placeholder="End date"
                  />
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isImporting ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : "Import"}
                  </button>
                </div>
              </div>

              {/* Export to Google */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Export to Google</h4>
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    value={exportStart}
                    onChange={(e) => setExportStart(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    placeholder="Start date"
                  />
                  <input
                    type="date"
                    value={exportEnd}
                    min={exportStart}
                    onChange={(e) => setExportEnd(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    placeholder="End date"
                  />
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="mt-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isExporting ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : "Export"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex h-[600px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={allCalendarEvents}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              // Optional: Handle drag & drop updates instantly
              eventDrop={async (info) => {
                const { event } = info;
                try {
                  await updateEvent({
                    id: event.id,
                    body: {
                      title: event.title,
                      start: event.start?.toISOString() || "",
                      end: event.end?.toISOString() || "",
                      category: event.extendedProps.category,
                      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                  }).unwrap();
                } catch (error) {
                  info.revert();
                  console.error("Failed to move event", error);
                }
              }}
            />
          )}
        </div>

        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <form onSubmit={handleSubmit} className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedEventId ? "Edit Event" : "Add Event"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Plan your next big moment: schedule or edit an event to stay on track
              </p>
            </div>

            <div className="mt-8">
              {/* Title Input */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                />
              </div>

              {/* Color Selection */}
              <div className="mt-6">
                <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                  Event Category
                </label>

                <div className="flex gap-4">
                  {categories.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                      <input
                        type="radio"
                        value={cat}
                        checked={category === cat}
                        onChange={() => setCategory(cat)}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>


              {/* Start Date */}
              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              {/* End Date */}
              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
              {selectedEventId && (
                <button
                  onClick={handleDelete}
                  type="button"
                  disabled={isDeleting}
                  className="flex w-full justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 sm:w-auto"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              )}
              <button
                onClick={closeModal}
                type="button"
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="btn btn-success flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto disabled:opacity-50"
              >
                {isCreating || isUpdating ? "Saving..." : selectedEventId ? "Update Changes" : "Add Event"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  // extendedProps is unknown in default type, safely access it
  const category = eventInfo.event.extendedProps.category || "PRIMARY";
  const colorClass = `fc-bg-${category.toLowerCase()}`;


  return (
    <div className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm w-full overflow-hidden`}>
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time font-semibold mr-1">{eventInfo.timeText}</div>
      <div className="fc-event-title truncate">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;
