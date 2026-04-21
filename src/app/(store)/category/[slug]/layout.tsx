import type { ReactNode } from "react";

export default function CategorySlugLayout({ children }: { children: ReactNode }) {
  return <div className="-mx-[var(--content-px-mobile)] md:mx-0">{children}</div>;
}

