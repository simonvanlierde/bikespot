import { render, screen } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import { AppFooter } from "@/components/AppFooter";
import { LANGS, setLang } from "@/lib/i18n";

describe("app footer", () => {
  it.each(LANGS)("includes the visible version in the source link name for %s", async (language) => {
    await setLang(language);
    render(<AppFooter />);
    expect(screen.getByRole("link")).toHaveAccessibleName(expect.stringContaining(`v${__APP_VERSION__}`));
  });
});
