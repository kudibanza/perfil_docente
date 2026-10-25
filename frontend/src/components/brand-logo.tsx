import Image from "next/image";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      className={className}
      src="/brand/logo-uniluanda.png"
      alt="Universidade de Luanda"
      width={400}
      height={540}
      priority
    />
  );
}
