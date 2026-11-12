"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "首页" },
  { href: "/discover", label: "发现" },
  { href: "/me", label: "我的" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="main-nav" aria-label="主导航">
      {LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} data-active={active}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
