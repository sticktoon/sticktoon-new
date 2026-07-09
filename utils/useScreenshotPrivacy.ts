import { useEffect, useState } from "react";

/**
 * Blurs sensitive content while the window is hidden or unfocused, so it does not
 * show up in OS task-switcher thumbnails or to someone walking past a tabbed-away
 * screen.
 *
 * This is cosmetic only. A browser cannot prevent OS-level screen capture: the
 * shell consumes PrintScreen / Win+Shift+S / Cmd+Shift+4 before the page sees
 * them, and a capture reads the framebuffer synchronously, faster than any
 * repaint can respond. Treat leaked content as inevitable and rely on watermarks
 * and access logs for accountability.
 *
 * @param enabled Pass false while exporting or printing so the overlay never
 *                lands in the captured output.
 */
export function useScreenshotPrivacy(enabled: boolean = true) {
  const [isScreenProtected, setIsScreenProtected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsScreenProtected(false);
      return;
    }

    const protectScreen = () => setIsScreenProtected(true);
    const unprotectScreen = () => setIsScreenProtected(false);

    const handleVisibilityChange = () => {
      if (document.hidden) protectScreen();
      else unprotectScreen();
    };

    window.addEventListener("blur", protectScreen);
    window.addEventListener("focus", unprotectScreen);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (document.hidden || !document.hasFocus()) {
      protectScreen();
    }

    return () => {
      window.removeEventListener("blur", protectScreen);
      window.removeEventListener("focus", unprotectScreen);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);

  return isScreenProtected;
}
