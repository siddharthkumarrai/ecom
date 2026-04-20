import { getSiteConfigOrMock } from "@/lib/store/data";

export default async function SupportPage() {
  const { config } = await getSiteConfigOrMock();

  return (
    <main className="rounded border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[32px] font-semibold leading-none sm:text-[44px]">{config.account.support.heading}</h1>
        <button className="w-full rounded-full bg-brand-yellow px-4 py-2 text-xs font-semibold sm:w-auto sm:text-sm">{config.account.support.createButtonLabel}</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[620px] text-[13px]">
          <thead className="text-left text-zinc-500">
            <tr>
              <th className="whitespace-nowrap py-2 pr-4">{config.account.support.ticketIdLabel}</th>
              <th className="whitespace-nowrap py-2 pr-4">{config.account.support.sendingDateLabel}</th>
              <th className="whitespace-nowrap py-2 pr-4">{config.account.support.subjectLabel}</th>
              <th className="whitespace-nowrap py-2 pr-4">{config.account.support.statusLabel}</th>
              <th className="whitespace-nowrap py-2">{config.account.support.optionsLabel}</th>
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
