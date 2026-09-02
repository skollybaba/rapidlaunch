export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // Only run in the server process that owns the app (dev / next start).
  if (process.env.NEXT_PHASE !== "phase-production-server" && process.env.NEXT_PHASE !== "phase-development-server") {
    return;
  }

  const REMINDER_INTERVAL_MS = 15 * 60 * 1000;

  const globals = globalThis as typeof globalThis & {
    __bookingReminderTimer?: ReturnType<typeof setInterval>;
  };

  if (globals.__bookingReminderTimer) return;

  const { dispatchBookingReminders } = await import(
    "@/lib/services/reminder-service"
  );

  async function run() {
    try {
      await dispatchBookingReminders();
    } catch (error) {
      // Reminders are best-effort; log and continue on the next tick.
      console.error("Booking reminder runner failed", { error });
    }
  }

  void run();
  globals.__bookingReminderTimer = setInterval(() => {
    void run();
  }, REMINDER_INTERVAL_MS);
}