import { getSiteConfigOrMock } from "@/lib/store/data";

export default async function ConversationsPage() {
  const { config } = await getSiteConfigOrMock();

  return (
    <main className="rounded border border-zinc-200 bg-white p-4">
      <h1 className="text-[44px] font-semibold leading-none">{config.account.conversations.heading}</h1>
      <p className="mt-2 text-sm text-zinc-500">{config.account.conversations.subtext}</p>
      <div className="mt-4 rounded border border-zinc-200 p-6">
        <div className="mx-auto h-72 w-72 rounded-full bg-[#cfe0f8]" />
        <p className="mt-4 text-center text-zinc-500">{config.account.conversations.emptyText}</p>
      </div>
    </main>
  );
}

