import { createPortal } from "react-dom";

type Props = {
  message: string;
};

/**
 * Full-viewport scrim shown while the window is unfocused. Portalled to
 * document.body so it stays outside the elements html2canvas captures, and
 * hidden in print, so it can never be baked into an exported PDF.
 * `backdrop-blur` frosts what is behind it while leaving the card legible.
 */
export default function ScreenshotPrivacyOverlay({ message }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xl print:hidden pointer-events-none">
      <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-900 shadow-2xl">
        <p className="text-lg font-black tracking-wide">🔒 CONTENT HIDDEN</p>
        <p className="mt-2 text-xs text-slate-500">{message}</p>
      </div>
    </div>,
    document.body
  );
}
