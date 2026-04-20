import { getSiteConfigOrMock } from "@/lib/store/data";

export default async function ConversationsPage() {
  const { config } = await getSiteConfigOrMock();

  return (
    <main className="rounded border border-zinc-200 bg-white p-3 sm:p-4">
      <h1 className="text-[32px] font-semibold leading-none sm:text-[44px]">{config.account.conversations.heading}</h1>
      <p className="mt-2 break-words text-xs text-zinc-500 sm:text-sm">{config.account.conversations.subtext}</p>
      <div className="mt-4 rounded border border-zinc-200 p-4 sm:p-6">
        <div className="mx-auto h-40 w-40 rounded-full bg-[#cfe0f8] sm:h-56 sm:w-56 md:h-64 md:w-64" />
        <p className="mt-4 break-words text-center text-zinc-500">{config.account.conversations.emptyText}</p>
      </div>
    </main>
  );
}
