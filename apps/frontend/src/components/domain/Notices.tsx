import { useEffect, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert role="alert" variant="error">
      <CircleAlert aria-hidden="true" />
      <span>{message}</span>
    </Alert>
  );
}

export function SuccessNotice({
  children,
  onClose,
  duration = 5000,
}: {
  children: ReactNode;
  onClose?: () => void;
  duration?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [children, duration, onClose]);

  if (!visible) return null;

  return (
    <Alert role="status" variant="success" className="pr-10 bg-card shadow-lg">
      <CircleCheck aria-hidden="true" />
      <div className="min-w-0">{children}</div>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          onClose?.();
        }}
        className="absolute right-2 top-2.5 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-success"
        aria-label="Cerrar"
      >
        <X className="size-4" />
      </button>
    </Alert>
  );
}
