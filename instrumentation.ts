export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // Run in the server process that owns the app (dev / next start), but not in
  // the build worker (NEXT_PHASE=phase-production-build). `next start` leaves
  // NEXT_PHASE unset, so an undefined phase must be allowed through — otherwise
  // no scheduler ever runs in production.
  const phase = process.env.NEXT_PHASE;
  if (phase === "phase-production-build" || phase === "phase-production-compile") {
    return;
  }

  const REMINDER_INTERVAL_MS = 15 * 60 * 1000;
  const SEQUENCE_INTERVAL_MS = 5 * 60 * 1000;
  // Scheduled broadcasts carry a specific clock time, so this tick is the
  // shortest of the three.
  const BROADCAST_INTERVAL_MS = 60 * 1000;

  const globals = globalThis as typeof globalThis & {
    __bookingReminderTimer?: ReturnType<typeof setInterval>;
    __emailSequenceTimer?: ReturnType<typeof setInterval>;
    __broadcastDispatchTimer?: ReturnType<typeof setInterval>;
  };

  if (globals.__bookingReminderTimer) return;

  const { dispatchBookingReminders } = await import(
    "@/lib/services/reminder-service"
  );
  const { dispatchEmailSequenceSteps } = await import(
    "@/lib/services/sequence-dispatch-service"
  );
  const { dispatchDueBroadcasts } = await import(
    "@/lib/services/broadcast-dispatch-service"
  );

  async function runReminders() {
    try {
      await dispatchBookingReminders();
    } catch (error) {
      // Reminders are best-effort; log and continue on the next tick.
      console.error("Booking reminder runner failed", { error });
    }
  }

  async function runSequences() {
    try {
      const result = await dispatchEmailSequenceSteps();
      if (result.sent > 0 || result.failed > 0) {
        console.info("Email sequence dispatch", {
          processed: result.processed,
          sent: result.sent,
          failed: result.failed,
        });
      }
    } catch (error) {
      // Sequences are best-effort; log and continue on the next tick.
      console.error("Email sequence runner failed", { error });
    }
  }

  async function runScheduledBroadcasts() {
    try {
      const result = await dispatchDueBroadcasts();
      if (result.delivered > 0 || result.failed > 0) {
        console.info("Scheduled broadcast dispatch", {
          processed: result.processed,
          delivered: result.delivered,
          failed: result.failed,
        });
      }
    } catch (error) {
      // Scheduled sends are best-effort per tick; the claim is released so
      // the next tick retries.
      console.error("Scheduled broadcast runner failed", { error });
    }
  }

  void runReminders();
  globals.__bookingReminderTimer = setInterval(() => {
    void runReminders();
  }, REMINDER_INTERVAL_MS);

  void runScheduledBroadcasts();
  globals.__broadcastDispatchTimer = setInterval(() => {
    void runScheduledBroadcasts();
  }, BROADCAST_INTERVAL_MS);

  // Delay the first sequence tick so it does not compete with the reminder
  // tick and DB connection on cold start.
  setTimeout(() => {
    void runSequences();
    if (globals.__emailSequenceTimer) return;
    globals.__emailSequenceTimer = setInterval(() => {
      void runSequences();
    }, SEQUENCE_INTERVAL_MS);
    console.info("Email sequence scheduler started", {
      intervalMinutes: SEQUENCE_INTERVAL_MS / 60000,
    });
  }, 60 * 1000);

  console.info("Background schedulers registered", {
    reminderMinutes: REMINDER_INTERVAL_MS / 60000,
    broadcastSeconds: BROADCAST_INTERVAL_MS / 1000,
  });
}