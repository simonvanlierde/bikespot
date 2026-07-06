import { Code2 } from "lucide-preact";

const SOURCE_URL = "https://github.com/simonvanlierde/bikespot";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <span>© {new Date().getFullYear()} Simon van Lierde</span>
      {/* Version doubles as the source link: a mono chip that reads like the
          object code stamped on a station sign, but is clearly tappable. */}
      <a
        className="app-footer__version"
        href={SOURCE_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={`View source code, version ${__APP_VERSION__}`}
      >
        <Code2 aria-hidden="true" className="app-footer__icon" />v{__APP_VERSION__}
      </a>
    </footer>
  );
}
