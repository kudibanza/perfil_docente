import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Universidade de Luanda, página inicial">
          <BrandLogo className="header-logo" />
        </Link>
        <Link className="nav-link" href="/">
          Página inicial
        </Link>
      </header>
      <main className="main">
        <section className="login-wrap">
          <div className="login-card">
            <p className="eyebrow">Área reservada</p>
            <h1>Bem-vindo</h1>
            <p className="login-intro">Entre com as credenciais da sua conta UniLuanda.</p>
            <LoginForm />
          </div>
        </section>
      </main>
      <footer className="footer">Universidade de Luanda</footer>
    </div>
  );
}
