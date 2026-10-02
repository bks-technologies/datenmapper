import Link from "next/link";
import { company } from "@/lib/legal";

export function SiteFooter() {
  return (
    <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[13px] text-muted">
      <span>
        Ein Projekt von{" "}
        <a href={company.website} className="font-medium text-ink hover:underline">
          BKS Technologies
        </a>
      </span>
      <nav className="flex gap-4">
        <Link href="/impressum" className="hover:text-ink">Impressum</Link>
        <Link href="/datenschutz" className="hover:text-ink">Datenschutz</Link>
      </nav>
    </footer>
  );
}
