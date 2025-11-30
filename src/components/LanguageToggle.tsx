import { Button } from "@/components/ui/button";

export default function LanguageToggle({
  label,
  onToggle,
}: {
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50">
      <Button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition"
      >
        {label}
      </Button>
    </div>
  );
}
