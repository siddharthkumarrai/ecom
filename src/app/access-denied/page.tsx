import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <section className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="mt-3 text-zinc-600">You do not have permission to view this page.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/" className="rounded bg-brand-yellow px-4 py-2 font-semibold">
            Go Home
          </Link>
          <Link href="/account/dashboard" className="rounded border border-zinc-300 px-4 py-2 font-semibold">
            My Account
          </Link>
        </div>
      </section>
    </main>
  );
}

