"use client";

import { useRef, useState } from "react";
import { ProfilePhoto } from "@/components/profile-photo";

export function PhotoControl({
  profileId,
  name,
  photoUrl,
  onChange,
}: {
  name: string;
  profileId: number;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isUploadedPhoto =
    photoUrl?.includes(`/api/v1/public/profile-photos/${profileId}/`) ?? false;
  const src = photoUrl ? (isUploadedPhoto ? `/api/profile-photo/${profileId}` : photoUrl) : null;

  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Escolha uma imagem JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A fotografia não pode exceder 5 MB.");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    try {
      const response = await fetch(`/api/backend/profiles/${profileId}/photo`, {
        method: "POST",
        body: form,
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          typeof body?.detail === "string"
            ? body.detail
            : "Não foi possível carregar a fotografia.",
        );
      onChange(body.photo_url);
      if (input.current) input.current.value = "";
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível carregar a fotografia.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/backend/profiles/${profileId}/photo`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          typeof body?.detail === "string" ? body.detail : "Não foi possível remover a fotografia.",
        );
      }
      onChange(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível remover a fotografia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo-control">
      <ProfilePhoto src={src} name={name} size="small" />
      <div>
        <strong>Fotografia do perfil</strong>
        <p>JPEG, PNG ou WebP, até 5 MB. A imagem será convertida para WebP.</p>
        <input
          ref={input}
          className="photo-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => upload(event.currentTarget.files?.[0])}
        />
        <div className="form-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? "A processar…" : photoUrl ? "Substituir fotografia" : "Escolher fotografia"}
          </button>
          {photoUrl && (
            <button
              className="text-button danger-text"
              type="button"
              disabled={busy}
              onClick={remove}
            >
              Remover
            </button>
          )}
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
