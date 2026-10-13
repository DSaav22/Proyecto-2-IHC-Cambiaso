import { type FormEvent, useEffect, useState } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import type { PlanInput } from "../../api/client";
import type { AddPlanResult } from "../../hooks/usePlans";
import { Button } from "@/components/ui/button";
import { Field } from "./Field";
import { TextArea } from "./TextArea";
import { ErrorAlert } from "./Notices";

const TITULO_MIN = 3;
const TITULO_MAX = 100;
const DESCRIPTION_MAX = 500;

type Errors = Partial<Record<keyof PlanInput, string>>;

function validate(values: PlanInput): Errors {
  const errors: Errors = {};
  if (!values.titulo) {
    errors.titulo = "Ingresa un título.";
  } else if (values.titulo.length < TITULO_MIN) {
    errors.titulo = `El título debe tener al menos ${TITULO_MIN} caracteres.`;
  } else if (values.titulo.length > TITULO_MAX) {
    errors.titulo = `El título debe tener máximo ${TITULO_MAX} caracteres.`;
  }
  if (!values.description) errors.description = "Ingresa una descripción.";
  else if (values.description.length > DESCRIPTION_MAX) {
    errors.description = `La descripción debe tener máximo ${DESCRIPTION_MAX} caracteres.`;
  }
  if (!values.dueDate) errors.dueDate = "Selecciona una fecha límite.";
  return errors;
}

interface PlanFormProps {
  onSubmit: (input: PlanInput) => Promise<AddPlanResult>;
  onCancel: () => void;
  initialData?: PlanInput | null;
  submitLabel?: string;
  submittingLabel?: string;
}

export function PlanForm({
  onSubmit,
  onCancel,
  initialData,
  submitLabel = "Crear plan",
  submittingLabel = "Creando…",
}: PlanFormProps) {
  const [titulo, setTitulo] = useState(initialData?.titulo ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTitulo(initialData?.titulo ?? "");
    setDescription(initialData?.description ?? "");
    setDueDate(initialData?.dueDate ?? "");
    setErrors({});
    setFormError(null);
  }, [initialData]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const values: PlanInput = { titulo: titulo.trim(), description: description.trim(), dueDate };
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      if (!result.ok) {
        const { titulo: tituloError, description: descriptionError, dueDate: dueDateError } = result.fieldErrors;
        setErrors({ titulo: tituloError, description: descriptionError, dueDate: dueDateError });
        if (!tituloError && !descriptionError && !dueDateError) setFormError(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <ErrorAlert message={formError} />
      <Field
        id="plan-titulo"
        label="Título"
        placeholder="Ej. Cena de cumpleaños"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        error={errors.titulo}
        maxLength={TITULO_MAX}
      />
      <TextArea
        id="plan-description"
        label="Descripción"
        placeholder="Ej. Cena de cumpleaños en casa de Ana"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
      />
      <Field
        id="plan-due-date"
        label="Fecha límite"
        type="date"
        icon={CalendarDays}
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        error={errors.dueDate}
      />
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
