import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, api, type AccountExport } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog, ErrorAlert } from "../components/domain";
import { Button } from "@/components/ui/button";

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MyDataPage() {
  const navigate = useNavigate();
  const { clearUser } = useAuth();
  const [data, setData] = useState<AccountExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api
      .getAccountData()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar tus datos."));
  }, []);

  async function downloadJson() {
    const snapshot = data ?? (await api.getAccountData());
    download("mis-datos-planazo.json", JSON.stringify(snapshot, null, 2), "application/json");
    void api.trackEvent("datos_descargados", { formato: "json" });
  }

  async function downloadCsv() {
    download("mis-datos-planazo.csv", await api.getAccountCsv(), "text/csv");
    void api.trackEvent("datos_descargados", { formato: "csv" });
  }

  async function handleDelete() {
    setPending(true);
    setDeleteError(null);
    void api.trackEvent("eliminacion_iniciada", {});
    try {
      await api.deleteAccount();
      clearUser();
      navigate("/login", { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo eliminar la cuenta.";
      const reason = err instanceof ApiError ? err.reason : undefined;
      if (reason === "planes_abiertos" || reason === "deuda_pendiente") {
        void api.trackEvent("eliminacion_bloqueada", { motivo: reason });
      }
      setDeleteError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Mis datos</h1>
        <p className="text-muted-foreground">Mirá qué guarda Planazo, descargalo o eliminá tu cuenta.</p>
      </header>

      <ErrorAlert message={error} />

      <section aria-labelledby="datos-titulo" className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <h2 id="datos-titulo" className="text-lg font-bold">
          Qué tenemos de vos
        </h2>
        {!data ? (
          <p role="status" className="text-muted-foreground">
            Cargando…
          </p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Nombre</dt>
              <dd className="font-semibold">{data.user.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Correo</dt>
              <dd className="font-semibold">{data.user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Planes que organizás</dt>
              <dd className="font-semibold">{data.plansOwned.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Planes a los que te uniste</dt>
              <dd className="font-semibold">{data.plansJoined.length}</dd>
            </div>
          </dl>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void downloadJson()}>
            Descargar JSON
          </Button>
          <Button type="button" variant="outline" onClick={() => void downloadCsv()}>
            Descargar CSV
          </Button>
        </div>
      </section>

      <section aria-labelledby="salida-titulo" className="flex flex-col gap-3 rounded-xl border bg-card p-5">
        <h2 id="salida-titulo" className="text-lg font-bold">
          Eliminar mi cuenta
        </h2>
        <p className="text-sm text-muted-foreground">
          Si organizás planes abiertos, cancelalos antes. Si tenés deudas en Gastos, pagalas antes.
          Después no vas a poder entrar con este correo.
        </p>
        <Button type="button" variant="outline" onClick={() => { setDeleteError(null); setConfirmOpen(true); }}>
          Eliminar mi cuenta
        </Button>
        <p className="text-sm text-muted-foreground">
          Ir a{" "}
          <Link to="/mis-planes" className="font-semibold text-primary underline-offset-4 hover:underline">
            Mis planes
          </Link>
        </p>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setDeleteError(null);
        }}
        title="¿Eliminar tu cuenta?"
        description="Vas a perder el acceso a Planazo. Si todavía tenés planes abiertos o deudas, te vamos a decir qué falta."
        cancelLabel="Mantener mi cuenta"
        confirmLabel="Eliminar mi cuenta"
        pendingLabel="Eliminando…"
        pending={pending}
        error={deleteError}
        destructive
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
