import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Universidade de Luanda, página inicial">
          <BrandLogo className="header-logo" />
        </Link>
      </header>
      <main className="main">
        <section className="hero">
          <div>
            <p className="eyebrow">Conhecimento · Serviço · Inovação</p>
            <h2>As pessoas que constroem o conhecimento.</h2>
            <p className="hero-copy">
              Conheça os docentes, funcionários e investigadores da Universidade de Luanda e
              descubra as suas áreas de trabalho, formação e produção científica.
            </p>
            <h3 className="hero-copy">Agir no Presnte para garantir o Futuro.</h3>
            <Link className="button" href="/docentes">
              Explorar perfis
            </Link>
          </div>
          <div className="hero-card">
            <div className="logo-card">
              <BrandLogo className="hero-logo" />
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">Universidade de Luanda</footer>
    </div>
  );
}
