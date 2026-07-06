import { Code2 } from "lucide-preact";

const SOURCE_URL = "https://github.com/simonvanlierde/bikespot";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <span>© {new Date().getFullYear()} Simon van Lierde</span>
      <span aria-hidden="true" className="app-footer__dot">
        ·
      </span>
      <a className="app-footer__link" href={SOURCE_URL} target="_blank" rel="noreferrer">
        <Code2 aria-hidden="true" className="app-footer__icon" />
        Source
      </a>
      {/* Mono version reads like the object code stamped on a station sign. */}
      <span className="app-footer__version">v{__APP_VERSION__}</span>
    </footer>
  );
}
