import Image from "next/image";

export function ProfilePhoto({
  src,
  name,
  size = "large",
}: {
  src: string | null;
  name: string;
  size?: "small" | "large";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const className = `profile-photo profile-photo-${size}`;
  if (!src)
    return (
      <div
        className={`${className} profile-photo-placeholder`}
        role="img"
        aria-label={`Sem fotografia para ${name}`}
      >
        {initials || "U"}
      </div>
    );
  return (
    <a
      className="profile-photo-link"
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir fotografia de ${name} em tamanho original`}
    >
      <Image
        className={className}
        src={src}
        alt={`Fotografia de ${name}`}
        width={size === "large" ? 280 : 112}
        height={size === "large" ? 280 : 112}
        unoptimized
      />
    </a>
  );
}
