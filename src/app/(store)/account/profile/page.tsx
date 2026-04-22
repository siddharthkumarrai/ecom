import { getSiteConfigOrMock } from "@/lib/store/data";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";
import AddressManager from "@/components/store/account/AddressManager";
import { ManageProfileForm } from "@/components/store/account/ManageProfileForm";

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
  let initialName = "";
  let initialPhone = "";
  let initialSalesCode = "";
  let initialProfileImageUrl = "";

  if (user?._id) {
    await connectDB();
    const dbUser = await User.findById(user._id)
      .select("addresses name phone salesCode profileImageUrl")
      .lean<{
        name?: string;
        phone?: string;
        salesCode?: string;
        profileImageUrl?: string;
        addresses?: Array<{
          _id?: unknown;
          name?: string;
          phone?: string;
          line1?: string;
          line2?: string;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          isDefault?: boolean;
        }>;
      } | null>();
    initialName = dbUser?.name ?? "";
    initialPhone = dbUser?.phone ?? "";
    initialSalesCode = dbUser?.salesCode ?? "";
    const rawProfileDoc = await User.collection.findOne(
      { _id: user._id },
      { projection: { profileImageUrl: 1 } }
    ) as { profileImageUrl?: string } | null;
    initialProfileImageUrl =
      typeof rawProfileDoc?.profileImageUrl === "string"
        ? rawProfileDoc.profileImageUrl
        : (dbUser?.profileImageUrl ?? "");
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
        <ManageProfileForm
          labels={{
            yourNameLabel: config.account.profile.yourNameLabel,
            yourNamePlaceholder: config.account.profile.yourNamePlaceholder,
            yourPhoneLabel: config.account.profile.yourPhoneLabel,
            yourPhonePlaceholder: config.account.profile.yourPhonePlaceholder,
            photoLabel: config.account.profile.photoLabel,
            salesCodeLabel: config.account.profile.salesCodeLabel,
            salesCodePlaceholder: config.account.profile.salesCodePlaceholder,
            yourPasswordLabel: config.account.profile.yourPasswordLabel,
            yourPasswordPlaceholder: config.account.profile.yourPasswordPlaceholder,
            confirmPasswordLabel: config.account.profile.confirmPasswordLabel,
            confirmPasswordPlaceholder: config.account.profile.confirmPasswordPlaceholder,
            updateProfileButtonLabel: config.account.profile.updateProfileButtonLabel,
          }}
          initialName={initialName}
          initialPhone={initialPhone}
          initialSalesCode={initialSalesCode}
          initialProfileImageUrl={initialProfileImageUrl}
        />
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
