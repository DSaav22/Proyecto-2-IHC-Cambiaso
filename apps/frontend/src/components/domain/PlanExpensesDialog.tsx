import { useState } from "react";
import type { ExpenseInput, ExpensesBoard, SplitMode } from "../../api/client";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { usePlanExpenses } from "../../hooks/usePlanExpenses";
import { describeBalance, formatBs, parseBsToCents, sumTypedAmounts } from "../../lib/money";

interface PlanExpensesDialogProps {
  planId: string;
  planTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ActionResult = Promise<{ ok: true } | { ok: false; message: string }>;
type Payment = ExpensesBoard["payments"][number];

const selectClass =
  "min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40";

const toneClass = {
  credit: "text-success",
  debt: "text-destructive",
  settled: "text-muted-foreground",
} as const;

const STATUS_LABEL: Record<Payment["status"], string> = {
  pendiente: "Pendiente de confirmación",
  confirmado: "Confirmado",
  rechazado: "Rechazado",
};

export function PlanExpensesDialog({ planId, planTitle, open, onOpenChange }: PlanExpensesDialogProps) {
  const { board, loading, error, pending, addExpense, registerPayment, confirmPayment, rejectPayment } =
    usePlanExpenses(planId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gastos</DialogTitle>
          <DialogDescription>
            En «{planTitle}» se registra quién pagó cada gasto y cómo se divide. Los pagos entre
            participantes solo bajan la deuda cuando quien los recibe los confirma.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        {loading && !board ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}

        {board ? (
          <div className="grid gap-5">
            <BalancesSection board={board} />
            <ExpenseForm
              key={board.participants.length}
              board={board}
              pending={pending}
              onSubmit={addExpense}
            />
            <ExpensesList board={board} />
            <PaymentsSection
              board={board}
              pending={pending}
              onRegister={registerPayment}
              onConfirm={confirmPayment}
              onReject={rejectPayment}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BalancesSection({ board }: { board: ExpensesBoard }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold">Saldos</h3>
      <ul aria-label="Saldos" className="grid gap-1">
        {board.participants.map((person) => {
          const balance = describeBalance(person.balanceCents);
          return (
            <li
              key={person.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <span>
                {person.name}
                {person.id === board.meId ? " (tú)" : ""}
              </span>
              <span className={cn("font-semibold", toneClass[balance.tone])}>{balance.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ExpenseForm({
  board,
  pending,
  onSubmit,
}: {
  board: ExpensesBoard;
  pending: boolean;
  onSubmit: (input: ExpenseInput) => ActionResult;
}) {
  const everyone = board.participants.map((person) => person.id);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(board.meId);
  const [splitMode, setSplitMode] = useState<SplitMode>("igual");
  const [selected, setSelected] = useState<string[]>(everyone);
  const [custom, setCustom] = useState<Record<string, string>>({});

  const totalCents = parseBsToCents(amount);
  const customCents = sumTypedAmounts(Object.values(custom));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await onSubmit({
      description,
      amount,
      paidById,
      splitMode,
      ...(splitMode === "igual"
        ? { participantIds: selected }
        : {
            shares: Object.entries(custom)
              .filter(([, value]) => value.trim())
              .map(([userId, value]) => ({ userId, amount: value })),
          }),
    });
    if (result.ok) {
      setDescription("");
      setAmount("");
      setCustom({});
      setSelected(everyone);
    }
  }

  return (
    <section className="grid gap-3 rounded-lg border border-border/70 p-3">
      <h3 className="font-semibold">Registrar gasto</h3>
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="expense-description">Descripción del gasto</Label>
            <Input
              id="expense-description"
              value={description}
              placeholder="Cena, taxi, entradas…"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="expense-amount">Monto total (Bs)</Label>
            <Input
              id="expense-amount"
              inputMode="decimal"
              value={amount}
              placeholder="120,50"
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="expense-payer">Pagó</Label>
          <select
            id="expense-payer"
            value={paidById}
            onChange={(event) => setPaidById(event.target.value)}
            className={selectClass}
          >
            {board.participants.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">Cómo se divide</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {(
              [
                ["igual", "Partes iguales"],
                ["personalizado", "Montos personalizados"],
              ] as const
            ).map(([mode, text]) => (
              <label key={mode} className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="split-mode"
                  className="size-4 accent-primary"
                  checked={splitMode === mode}
                  onChange={() => setSplitMode(mode)}
                />
                {text}
              </label>
            ))}
          </div>

          {splitMode === "igual" ? (
            <div className="grid gap-1">
              <p className="text-xs text-muted-foreground">Entre quiénes se divide:</p>
              <div className="flex flex-wrap gap-x-4 text-sm">
                {board.participants.map((person) => (
                  <label key={person.id} className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selected.includes(person.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, person.id]
                            : current.filter((id) => id !== person.id),
                        )
                      }
                    />
                    {person.name}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="grid gap-2 sm:grid-cols-3">
                {board.participants.map((person) => (
                  <div key={person.id} className="grid gap-1">
                    <Label htmlFor={`share-${person.id}`}>Monto de {person.name}</Label>
                    <Input
                      id={`share-${person.id}`}
                      inputMode="decimal"
                      value={custom[person.id] ?? ""}
                      placeholder="0"
                      onChange={(event) =>
                        setCustom((current) => ({ ...current, [person.id]: event.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
              <p
                aria-live="polite"
                className={cn(
                  "text-xs font-medium",
                  totalCents !== null && customCents === totalCents
                    ? "text-success"
                    : "text-muted-foreground",
                )}
              >
                Suman {formatBs(customCents)} de {formatBs(totalCents ?? 0)}
              </p>
            </div>
          )}
        </fieldset>

        <div className="flex justify-end">
          <Button type="submit" size="sm" className="min-h-11" disabled={pending}>
            Agregar gasto
          </Button>
        </div>
      </form>
    </section>
  );
}

function ExpensesList({ board }: { board: ExpensesBoard }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold">Gastos registrados</h3>
      {board.expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay gastos.</p>
      ) : (
        <ul aria-label="Gastos registrados" className="grid gap-2">
          {board.expenses.map((expense) => (
            <li key={expense.id} className="grid gap-1 rounded-lg border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {expense.description} · {formatBs(expense.amountCents)}
                </p>
                <Badge variant="muted">
                  {expense.splitMode === "igual" ? "Partes iguales" : "Personalizado"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Pagó {expense.paidBy.name} ·{" "}
                {expense.shares
                  .map((share) => `${share.name} ${formatBs(share.amountCents)}`)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PaymentsSection({
  board,
  pending,
  onRegister,
  onConfirm,
  onReject,
}: {
  board: ExpensesBoard;
  pending: boolean;
  onRegister: (toUserId: string, amount: string) => ActionResult;
  onConfirm: (paymentId: string) => ActionResult;
  onReject: (paymentId: string, reason: string) => ActionResult;
}) {
  const me = board.participants.find((person) => person.id === board.meId);
  const pendingSent = board.payments
    .filter((payment) => payment.from.id === board.meId && payment.status === "pendiente")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const owedCents = Math.max(0, -(me?.balanceCents ?? 0) - pendingSent);
  const creditors = board.participants.filter(
    (person) => person.id !== board.meId && person.balanceCents > 0,
  );

  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function pickCreditor(id: string) {
    setToUserId(id);
    const creditor = creditors.find((person) => person.id === id);
    if (creditor) {
      const suggested = Math.min(owedCents, creditor.balanceCents);
      setAmount((suggested / 100).toFixed(2).replace(".", ","));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await onRegister(toUserId, amount);
    if (result.ok) {
      setToUserId("");
      setAmount("");
    }
  }

  async function sendRejection(event: React.FormEvent, paymentId: string) {
    event.preventDefault();
    const result = await onReject(paymentId, reason);
    if (result.ok) {
      setRejecting(null);
      setReason("");
    }
  }

  return (
    <section className="grid gap-3 rounded-lg border border-border/70 p-3">
      <h3 className="font-semibold">Pagos</h3>

      {owedCents > 0 && creditors.length > 0 ? (
        <form onSubmit={submit} className="grid gap-2">
          <p className="text-sm">
            Debes <strong>{formatBs(owedCents)}</strong>. Registra el pago y espera a que la otra
            persona lo confirme.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1">
              <Label htmlFor="payment-to">Pagar a</Label>
              <select
                id="payment-to"
                value={toUserId}
                onChange={(event) => pickCreditor(event.target.value)}
                className={selectClass}
              >
                <option value="">Elige a quién</option>
                {creditors.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="payment-amount">Monto del pago (Bs)</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <Button type="submit" size="sm" className="min-h-11" disabled={pending}>
              Registrar pago
            </Button>
          </div>
        </form>
      ) : null}

      {board.payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
      ) : (
        <ul aria-label="Pagos" className="grid gap-2">
          {board.payments.map((payment) => {
            const isReceiver = payment.to.id === board.meId;
            const canAnswer = isReceiver && payment.status === "pendiente";
            return (
              <li key={payment.id} className="grid gap-2 rounded-lg border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {payment.from.name} le paga {formatBs(payment.amountCents)} a {payment.to.name}
                  </p>
                  <Badge
                    variant={
                      payment.status === "confirmado"
                        ? "success"
                        : payment.status === "rechazado"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {STATUS_LABEL[payment.status]}
                  </Badge>
                </div>
                {payment.status === "rechazado" && payment.rejectReason ? (
                  <p className="text-xs text-muted-foreground">Motivo: {payment.rejectReason}</p>
                ) : null}
                {payment.status === "pendiente" && payment.from.id === board.meId ? (
                  <p className="text-xs text-muted-foreground">
                    Esperando que {payment.to.name} lo confirme. Mientras tanto tu saldo no cambia.
                  </p>
                ) : null}

                {canAnswer && rejecting !== payment.id ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-11"
                      disabled={pending}
                      aria-label={`Confirmar pago de ${payment.from.name}`}
                      onClick={() => void onConfirm(payment.id)}
                    >
                      Confirmar pago
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-11"
                      disabled={pending}
                      aria-label={`Rechazar pago de ${payment.from.name}`}
                      onClick={() => {
                        setRejecting(payment.id);
                        setReason("");
                      }}
                    >
                      Rechazar
                    </Button>
                  </div>
                ) : null}

                {canAnswer && rejecting === payment.id ? (
                  <form onSubmit={(event) => void sendRejection(event, payment.id)} className="grid gap-2">
                    <Label htmlFor={`reject-${payment.id}`}>Motivo del rechazo</Label>
                    <textarea
                      id={`reject-${payment.id}`}
                      rows={2}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      className="rounded-lg border border-input bg-card px-3 py-2"
                      placeholder="Por ejemplo: no me llegó la transferencia"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" variant="destructive" className="min-h-11" disabled={pending}>
                        Enviar rechazo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        onClick={() => setRejecting(null)}
                      >
                        Volver
                      </Button>
                    </div>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
