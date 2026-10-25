"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";

type Role = "USER" | "UNIT_ADMIN" | "SUPER_ADMIN";
const roleNames: Record<Role, string> = {
  USER: "Área pessoal",
  UNIT_ADMIN: "Administração da unidade",
  SUPER_ADMIN: "Administração global",
};
const navigation: Record<Role, { href: string; label: string; icon: string }[]> = {
  USER: [{ href: "/painel/perfil", label: "O meu perfil", icon: "◉" }],
  UNIT_ADMIN: [
    { href: "/painel/unidade", label: "Dashboard", icon: "◈" },
    { href: "/painel/unidade/perfis", label: "Perfis", icon: "◎" },
    { href: "/painel/unidade/catalogo/cursos", label: "Cursos", icon: "▤" },
    { href: "/painel/unidade/catalogo/disciplinas", label: "Disciplinas", icon: "≡" },
    { href: "/painel/unidade/anos-academicos", label: "Anos académicos", icon: "◷" },
  ],
  SUPER_ADMIN: [
    { href: "/painel/super-admin", label: "Dashboard", icon: "◈" },
    { href: "/painel/super-admin/contas", label: "Contas de utilizadores", icon: "◎" },
    { href: "/painel/super-admin/perfis", label: "Perfis", icon: "♙" },
    { href: "/painel/super-admin/unidades", label: "Unidades Orgânicas", icon: "▦" },
    { href: "/painel/super-admin/gestao-unidades", label: "Gestão de Unidades", icon: "⌘" },
    { href: "/painel/super-admin/cursos", label: "Cursos", icon: "▤" },
    { href: "/painel/super-admin/disciplinas", label: "Disciplinas", icon: "≡" },
  ],
};

export function AdminShell({
  role,
  email,
  permissions = [],
  children,
}: {
  role: Role;
  email: string;
  permissions?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catalogPreference, setCatalogPreference] = useState<boolean | null>(null);
  const catalogOpen =
    catalogPreference ?? (pathname.endsWith("/cursos") || pathname.endsWith("/disciplinas"));
  const links =
    role === "UNIT_ADMIN" && permissions.includes("CREATE_USER_ACCOUNT")
      ? [
          ...navigation[role],
          { href: "/painel/unidade/contas", label: "Contas de utilizadores", icon: "♙" },
        ]
      : navigation[role];
  const sidebar = (
    <aside className={`admin-sidebar${mobileOpen ? " admin-sidebar-open" : ""}`}>
      <Link className="sidebar-brand" href="/painel" onClick={() => setMobileOpen(false)}>
        <BrandLogo className="sidebar-logo" />
        <span>
          <strong>UniLuanda</strong>
          <small>Portal institucional</small>
        </span>
      </Link>
      <div className="sidebar-user">
        <span className="sidebar-avatar">{email.slice(0, 1).toUpperCase()}</span>
        <span className="sidebar-user-copy">
          <strong>{email}</strong>
          <small>{roleNames[role]}</small>
        </span>
      </div>
      <p className="sidebar-label">MENU</p>
      <nav className="sidebar-nav" aria-label="Navegação da área administrativa">
        {links.map((item) => {
          if (item.label === "Disciplinas") return null;
          if (item.label === "Cursos") {
            const coursesHref = item.href;
            const disciplinesHref = links.find((link) => link.label === "Disciplinas")?.href ?? "#";
            const catalogActive = pathname === coursesHref || pathname === disciplinesHref;
            return (
              <div className="sidebar-group" key="catalog-group">
                <button
                  className={`sidebar-link sidebar-dropdown${catalogActive ? " sidebar-link-active" : ""}`}
                  type="button"
                  aria-expanded={catalogOpen}
                  aria-controls="sidebar-catalog-items"
                  onClick={() => setCatalogPreference(!catalogOpen)}
                >
                  <span className="sidebar-link-icon" aria-hidden="true">
                    ▦
                  </span>
                  Catálogo
                  <span
                    className={`sidebar-dropdown-arrow${catalogOpen ? " sidebar-dropdown-arrow-open" : ""}`}
                    aria-hidden="true"
                  >
                    ⌄
                  </span>
                </button>
                {catalogOpen && (
                  <div className="sidebar-subnav" id="sidebar-catalog-items">
                    {[
                      { href: coursesHref, label: "Cursos", icon: item.icon },
                      { href: disciplinesHref, label: "Disciplinas", icon: "≡" },
                    ].map((child) => {
                      const active = pathname === child.href;
                      return (
                        <Link
                          className={`sidebar-link sidebar-link-subitem${active ? " sidebar-link-active" : ""}`}
                          href={child.href}
                          key={child.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMobileOpen(false)}
                        >
                          <span className="sidebar-link-icon" aria-hidden="true">
                            {child.icon}
                          </span>
                          {child.label}
                          <span className="sidebar-link-indicator" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const active =
            pathname === item.href ||
            (item.href.endsWith("/cursos") && pathname.endsWith("/cursos")) ||
            (item.href.endsWith("/disciplinas") && pathname.endsWith("/disciplinas"));
          return (
            <Fragment key={item.href}>
              <Link
                className={`sidebar-link${active ? " sidebar-link-active" : ""}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
                <span className="sidebar-link-indicator" />
              </Link>
            </Fragment>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <Link className="sidebar-public-link" href="/docentes">
          <span aria-hidden="true">↗</span> Ver portal público
        </Link>
        <div className="sidebar-logout">
          <LogoutButton />
        </div>
        <small className="sidebar-footer">Universidade de Luanda · 2026</small>
      </div>
    </aside>
  );

  return (
    <div className="admin-shell">
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {sidebar}
      <div className="admin-workspace">
        <header className="admin-mobile-header">
          <Link href="/painel" aria-label="Painel UniLuanda">
            <BrandLogo className="mobile-logo" />
          </Link>
          <span>{roleNames[role]}</span>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? "×" : "☰"}
          </button>
        </header>
        {children}
        <footer className="footer admin-footer">Área de gestão UniLuanda</footer>
      </div>
    </div>
  );
}
