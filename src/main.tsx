import { registerSW } from "virtual:pwa-register";
import { effect } from "@preact/signals";
import { render } from "preact";
import App from "./App";
import { overlay } from "./lib/store";
// Applies the stored theme to <html> at import, before the first render.
import "./lib/theme";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

render(<App />, rootElement);

registerSW({
  immediate: true,
  onRegisterError: (error) => console.error("Service worker registration failed", error),
  // autoUpdate reloads on activation; hold it while a sheet is open so an
  // unsaved draft isn't thrown away mid-edit.
  onNeedReload: () => {
    if (overlay.value.kind === "closed") {
      window.location.reload();
      return;
    }
    const dispose = effect(() => {
      if (overlay.value.kind === "closed") {
        dispose();
        window.location.reload();
      }
    });
  },
});
