import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-8 sm:px-6">
      <Link href="/" className="text-[13px] font-medium text-accent hover:underline">
        ← Zum Datenmapper
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed [&_a]:text-accent [&_a]:underline [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
