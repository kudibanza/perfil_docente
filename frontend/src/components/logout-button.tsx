"use client";

import { useState } from "react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/session/logout", { method: "POST" });
      if (!response.ok) throw new Error("Não foi possível terminar a sessão. Tente novamente.");
      window.location.replace("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ocorreu um erro ao terminar a sessão.");
      setBusy(false);
    }
  }

  return (
    <div className="logout-control">
      <button className="logout-button" type="button" onClick={logout} disabled={busy}>
        {busy ? "A sair…" : "Terminar sessão"}
      </button>
      {error && (
        <span className="logout-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
