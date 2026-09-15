import { Check, Circle } from "lucide-react";

// Mirrors backend/utils/passwordPolicy.js - keep the two in step.
export const ADMIN_PASSWORD_RULES = [
  { label: "12+ characters", test: (p: string) => p.length >= 12 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /\d/.test(p) },
  { label: "Special character", test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
];

export const ADMIN_PASSWORD_HINT =
  "Admin passwords need 12+ characters with an uppercase letter, a lowercase letter, a number and a special character";

export const meetsAdminPasswordRules = (password: string) =>
  password.length <= 128 && ADMIN_PASSWORD_RULES.every((rule) => rule.test(password));

export default function PasswordRules({ password }: { password: string }) {
  return (
    <ul aria-label="Password requirements" className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-semibold">
      {ADMIN_PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.label} className={`flex items-center gap-1.5 ${ok ? "text-green-600" : "text-slate-500"}`}>
            {ok ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Circle className="w-3 h-3" aria-hidden />}
            <span>
              {rule.label}
              <span className="sr-only">{ok ? " - done" : " - missing"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
