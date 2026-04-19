import type { SectionRenderProps } from "@/components/store/sections/registry";

export function NewsletterSignupSection({ section, siteConfig }: SectionRenderProps) {
  const text = String(section.config.text || siteConfig.footer.newsletterText);
  const placeholder = String(
    section.config.placeholder || siteConfig.footer.newsletterPlaceholder
  );
  const buttonText = String(section.config.buttonText || siteConfig.footer.newsletterButtonText);

  return (
    <section className="rounded-md bg-[#f5c400] px-4 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-semibold text-zinc-900">{text}</p>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <input
            className="h-10 w-full rounded-sm border border-zinc-700/20 bg-white px-3 text-sm md:w-72"
            placeholder={placeholder}
          />
          <button className="h-10 rounded-sm bg-zinc-900 px-4 text-xs font-bold text-white">
            {buttonText}
          </button>
        </div>
      </div>
    </section>
  );
}
