const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

// An installed PWA resumed from the background never navigates, so the browser's
// own check on navigation does not run. Ask for a new service worker hourly and
// whenever the page comes back to the front.
export function checkForUpdates(registration: ServiceWorkerRegistration): void {
  // Offline or a flaky network: the next check tries again.
  const update = () => registration.update().catch(() => undefined);

  setInterval(update, UPDATE_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      update();
    }
  });
}
