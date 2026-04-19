import { getSiteConfigOrMock } from "@/lib/store/data";

export default async function SupportPage() {
  const { config } = await getSiteConfigOrMock();

  return (
    <main className="rounded border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[44px] font-semibold leading-none">{config.account.support.heading}</h1>
        <button className="rounded-full bg-brand-yellow px-4 py-2 text-sm font-semibold">{config.account.support.createButtonLabel}</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead className="text-left text-zinc-500">
            <tr>
              <th className="py-2">{config.account.support.ticketIdLabel}</th>
              <th className="py-2">{config.account.support.sendingDateLabel}</th>
              <th className="py-2">{config.account.support.subjectLabel}</th>
              <th className="py-2">{config.account.support.statusLabel}</th>
              <th className="py-2">{config.account.support.optionsLabel}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-3 text-zinc-600" colSpan={5}>
                {config.account.support.emptyText}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}

