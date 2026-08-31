import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface Props {
  to?: string;
  label?: string;
  fallback?: string;
}

export default function AdminBackButton({
  to,
  fallback = "/admin",
  label = "Back",
}: Props) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 mb-4 transition-colors"
    >
      <ArrowLeft size={18} />
      {label}
    </button>
  );
}
