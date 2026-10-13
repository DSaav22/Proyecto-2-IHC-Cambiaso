import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JoinPlanResult } from "../../hooks/usePlans";

interface JoinPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (code: string) => Promise<JoinPlanResult>;
}

export function JoinPlanDialog({ open, onOpenChange, onJoin }: JoinPlanDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Ingresa el código del plan.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const result = await onJoin(trimmed);
      if (result.ok) {
        setCode("");
        onOpenChange(false);
      } else {
        setError(result.message);
      }
    } finally {
      setPending(false);
    }
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setCode("");
      setError(null);
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <span className="mb-1 inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Users aria-hidden="true" className="size-6" />
          </span>
          <DialogTitle>Unirse a un plan</DialogTitle>
          <DialogDescription>
            Ingresa el código compartido por el organizador para ver los detalles del plan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 pt-2">
          <div className="grid gap-2">
            <Label htmlFor="plan-share-code">Código del plan</Label>
            <Input
              id="plan-share-code"
              name="code"
              type="text"
              placeholder="Ej: PLZ-7K9M2X"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              autoComplete="off"
              className="font-mono tracking-wider uppercase"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "join-code-error" : undefined}
            />
            {error ? (
              <p id="join-code-error" role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Uniéndose…" : "Unirse al plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
