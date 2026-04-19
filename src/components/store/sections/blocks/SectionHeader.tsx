export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[32px] font-medium text-zinc-800">{title}</h2>
      <span className="mt-1 inline-block h-[2px] w-20 bg-[#f5c400]" />
    </div>
  );
}
