export default function StoreLoading() {
  return (
    <main className="space-y-4 bg-[#efefef] pb-4 md:space-y-5">
      <section className="border border-zinc-200 bg-white p-3 md:p-4">
        <phantom-ui loading animation="shimmer" reveal={0.2}>
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="relative overflow-hidden rounded-none border border-zinc-200 bg-[#f2f2f2] sm:rounded-md">
              <div className="relative grid min-h-[184px] grid-cols-2 items-center sm:min-h-[220px] md:min-h-[390px] md:grid-cols-[1fr_1.3fr]">
                <div className="flex h-full flex-col justify-center px-2.5 py-2 sm:px-3.5 sm:py-3 md:px-8 md:py-8">
                  <p className="text-[10px] uppercase">Loading hero</p>
                  <h1 className="mt-2 text-[clamp(16px,4.5vw,44px)] font-light uppercase leading-tight">Storefront headline</h1>
                  <p className="mt-2 text-[12px] uppercase">Component details and promotional text</p>
                  <div className="mt-6 inline-flex w-[160px] items-center justify-center rounded-[10px] px-6 py-3 text-[14px] font-medium">
                    Explore Now
                  </div>
                </div>
                <div className="relative flex min-h-[184px] items-center justify-center sm:min-h-[220px] md:min-h-[390px]">
                  <div className="h-[70%] w-[90%] rounded-md" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`hero-side-skeleton-${index}`} className="grid min-h-[124px] grid-cols-[120px_minmax(0,1fr)] overflow-hidden border border-zinc-200 bg-[#efefef]">
                  <div className="h-full w-full" />
                  <div className="p-2.5">
                    <p className="text-[13px] uppercase leading-[1.12]">Promo title</p>
                    <p className="mt-1 text-[10px] uppercase leading-[14px]">Promo subtitle</p>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold">Shop now</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </phantom-ui>
      </section>

      <section className="border border-zinc-200 bg-white p-3 md:p-4">
        <phantom-ui loading animation="shimmer" count={2}>
          <div className="rounded border border-zinc-200 bg-white p-3">
            <h2 className="text-[28px] uppercase">Category title</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={`product-card-skeleton-${index}`} className="min-h-[190px] border border-zinc-200 p-2.5">
                  <p className="text-[10px]">Brand</p>
                  <p className="mt-1 text-[12px] font-semibold">Product name line 1</p>
                  <p className="text-[12px] font-semibold">Product name line 2</p>
                  <div className="mt-2 h-[84px] w-full rounded-sm" />
                  <p className="mt-2 text-[14px] font-medium">₹ 0.00</p>
                </div>
              ))}
            </div>
          </div>
        </phantom-ui>
      </section>
    </main>
  );
}

