"use client";

import { useState, type FormEvent } from "react";

export function CreateUserAccount() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/backend/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "USER", organizational_unit_id: null }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          typeof body?.detail === "string" ? body.detail : "Não foi possível criar a conta.",
        );
      setNotice(
        `Conta ${body.email} criada. O utilizador poderá iniciar sessão e criar o seu perfil profissional.`,
      );
      setEmail("");
      setPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="eyebrow">UNIT_ADMIN</p>
      <h1>Criar utilizador</h1>
      <p className="hero-copy">
        Crie uma conta comum para acesso à plataforma. Esta permissão não permite criar outras
        contas administrativas.
      </p>
      <section className="profile-section">
        <div className="section-heading">
          <div>
            <h2>Nova conta USER</h2>
            <p>A conta poderá iniciar sessão e completar o perfil profissional.</p>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="success-message" role="status">
            {notice}
          </p>
        )}
        <form className="record-form account-create-form" onSubmit={submit}>
          <label className="field">
            Email institucional
            <input
              type="email"
              autoComplete="email"
              required
              minLength={3}
              maxLength={320}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            Palavra-passe inicial
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={1024}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <small>
              Use pelo menos 12 caracteres e transmita a credencial por um canal seguro.
            </small>
          </label>
          <button className="button" type="submit" disabled={busy}>
            {busy ? "A criar conta…" : "Criar conta USER"}
          </button>
        </form>
      </section>
    </>
  );
}
