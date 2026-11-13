import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type PlanInvitation } from "../api/client";

export type InvitationResult = { ok: true } | { ok: false; message: string };

export function useInvitations() {
  const [invitations, setInvitations] = useState<PlanInvitation[]>([]);
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    try {
      setInvitations(await api.listInvitations());
    } catch {
      setInvitations([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function answer(id: string, action: (id: string) => Promise<unknown>): Promise<InvitationResult> {
    setPending(true);
    try {
      await action(id);
      setInvitations((current) => current.filter((invitation) => invitation.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof ApiError ? err.message : "No se pudo responder la invitación." };
    } finally {
      setPending(false);
    }
  }

  return {
    invitations,
    pending,
    accept: (id: string) => answer(id, api.acceptInvitation),
    decline: (id: string) => answer(id, api.declineInvitation),
  };
}
