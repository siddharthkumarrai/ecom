import { getSiteConfigOrMock } from "@/lib/store/data";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";
import AddressManager from "@/components/store/account/AddressManager";

export default async function ProfilePage() {
  const { config } = await getSiteConfigOrMock();
  const { user } = await requireUser();
  let addresses: Array<{
    _id: string;
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    pincode: string;
    country?: string;
    isDefault?: boolean;
  }> = [];

  if (user?._id) {
    await connectDB();
    const dbUser = await User.findById(user._id).select("addresses").lean();
    addresses =
      dbUser?.addresses?.map((a) => ({
        _id: String((a as { _id?: unknown })._id ?? ""),
        name: a.name ?? "",
        phone: a.phone ?? "",
        line1: a.line1 ?? "",
        line2: a.line2 ?? "",
        city: a.city ?? "",
        state: a.state ?? "",
        pincode: a.pincode ?? "",
        country: a.country ?? "India",
        isDefault: !!a.isDefault,
      })) ?? [];
  }

  return (
    <main className="space-y-4 sm:space-y-5">
      <section className="rounded border border-zinc-200 bg-white p-3 sm:p-4">
        <h1 className="text-[32px] font-semibold leading-none sm:text-[44px]">{config.account.profile.heading}</h1>
        <h2 className="mt-4 text-lg font-semibold sm:mt-5 sm:text-xl">{config.account.profile.basicInfoHeading}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
          <label className="text-sm text-zinc-600">{config.account.profile.yourNameLabel}</label>
          <input className="h-9 w-full rounded border border-zinc-300 px-3 text-sm" placeholder={config.account.profile.yourNamePlaceholder} defaultValue="sidd" />
          <label className="text-sm text-zinc-600">{config.account.profile.yourPhoneLabel}</label>
          <input className="h-9 w-full rounded border border-zinc-300 px-3 text-sm" placeholder={config.account.profile.yourPhonePlaceholder} />
          <label className="text-sm text-zinc-600">{config.account.profile.photoLabel}</label>
          <input className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm" type="file" />
          <label className="text-sm text-zinc-600">{config.account.profile.salesCodeLabel}</label>
          <input className="h-9 w-full rounded border border-zinc-300 px-3 text-sm" placeholder={config.account.profile.salesCodePlaceholder} />
          <label className="text-sm text-zinc-600">{config.account.profile.yourPasswordLabel}</label>
          <input className="h-9 w-full rounded border border-zinc-300 px-3 text-sm" placeholder={config.account.profile.yourPasswordPlaceholder} />
          <label className="text-sm text-zinc-600">{config.account.profile.confirmPasswordLabel}</label>
          <input className="h-9 w-full rounded border border-zinc-300 px-3 text-sm" placeholder={config.account.profile.confirmPasswordPlaceholder} />
        </div>
        <div className="mt-4 flex justify-stretch sm:justify-end">
          <button className="w-full rounded bg-brand-yellow px-4 py-2 text-sm font-semibold sm:w-auto">{config.account.profile.updateProfileButtonLabel}</button>
        </div>
      </section>

      <section className="rounded border border-zinc-200 bg-white p-3 sm:p-4">
        <h2 className="text-xl font-semibold">{config.account.profile.addressHeading}</h2>
        <div className="mt-4">
          <AddressManager initialAddresses={addresses} />
        </div>
      </section>
    </main>
  );
}
