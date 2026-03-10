import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface Props {
  to?: string;
  label?: string;
}

export default function AdminBackButton({
  to = "/admin",
  label = "Back",
}: Props) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 mb-4"
    >
      <ArrowLeft size={18} />
      {label}
    </button>
  );
}
