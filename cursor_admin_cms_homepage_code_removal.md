# Admin CMS homepage code removal
_Exported on 4/18/2026 at 11:38:26 GMT+5:30 from Cursor (3.1.15)_

---

**User**

@CONTEXT.md 
remove all code of admin CMS Homepage
make sure did not braek existing any functionality and designs of pages,
i want only remove admin cms homepage storefront releated all code because it iss too massey

---

**Cursor**

Removing Admin CMS Homepage code while preserving other admin functionality. Exploring the project and locating all related code.



Removing the admin CMS homepage and preview routes, updating the admin sidebar, and implementing a minimal announcements editor on the existing Announcements page so announcement toggles and text remain editable (they previously depended on the removed page).



Writing the announcements admin page to edit the announcement bar via the existing CMS API.



Here is what was changed.

### Removed
- **`src/app/(admin)/admin/cms/homepage/page.tsx`** — entire Admin “CMS Homepage” UI (Appearance / Homepage / Account tabs, live preview wiring, etc.).
- **`src/app/(admin)/admin/cms/preview/page.tsx`** — full-width preview page that only read `localStorage` from that homepage editor.

### Updated
- **`src/app/(admin)/layout.tsx`** — removed the **“CMS Homepage”** sidebar entry so nothing links to a missing route.

### Preserved behavior
- **Storefront** is unchanged: it still uses `getSiteConfigOrMock()` / `SiteConfig` for layout, hero, colors, etc.
- **`/api/v1/cms`** is unchanged — **Delivery Charges**, **Coupons**, and **Payments** still use it.
- **`cms_store_preview` cookie** handling in `proxy` and store layouts stays; it simply won’t be set from the admin UI anymore.

### Announcements
The old Announcements screen only pointed at Homepage CMS. It’s now a small **client** editor on **`/admin/cms/announcements`** that loads and PATCHes **`announcement`** (enabled flag, primary message text, scroll speed) via the same API, so you can still control the top announcement strip without the large homepage CMS.

`npm run lint` completed (same 3 existing warnings elsewhere). **`npm run build` succeeded**; routes now list `/admin/cms/announcements` only under `admin/cms`, with no `/admin/cms/homepage` or `/admin/cms/preview`.

**Note:** Hero, category sections, appearance colors, account labels, etc. are no longer editable from the admin UI; they remain whatever is already in MongoDB (or defaults from your seed/mock path). If you want a smaller second admin screen for one of those later, say which slice matters most.

---

**User**

i want homepage is editable and managable through admin panel,
admin can add any section twice ,thrice and manage three prefrence,
currently this is static, i want full dynamic,
plese did not break existing design and layouts and functionality,
if you want to change products api,category plese make homepahe editable and managable through admin dashboard ,
admin can manage hompage,add any section remove any section and manage preference of section

---

**Cursor**

Exploring how the homepage and section system work so we can add an admin-managed, dynamic homepage without breaking the storefront design.



Implementing admin-only homepage section APIs, fixing merge logic so saved layouts aren't auto-modified, making top-categories respect per-section slugs, and adding a focused admin homepage editor.



Treating empty `slides`/`cards` arrays as "use global SiteConfig" so the JSON editor doesn't wipe the hero.



Here is what was implemented.

### Behavior

1. **Storefront** (`getHomepageConfig`)  
   - If **`homepage.sections` is empty** → same as before: built-in default stack + optional extra category rows from `homepage.categorySections`.  
   - If **`homepage.sections` is saved** → the homepage uses **only that list** (sorted, `enabled !== false`). Nothing else is merged in, so you can repeat sections (e.g. two newsletters, two LED rows) and control order yourself.

2. **Admin** → **`/admin/cms/homepage`** (sidebar: **Homepage sections**)  
   - **Order**: Up / Down (orders are normalized as 10, 20, 30… on save).  
   - **On**: checkbox = show on site (`enabled`).  
   - **Content / “preference”**: **Edit** opens type-specific fields (category row, brand banner, week deals, top categories slugs, JSON for hero slides / promo cards, etc.).  
   - **Add section**, **Duplicate**, **Remove**, **Save layout**, **Reload**, **Reset to default layout** (writes the same default stack you get when `sections` is empty).

3. **API** → **`/api/v1/admin/homepage-sections`** (admin-only)  
   - **GET** – current `homepage.sections`  
   - **PUT** – replace sections; uses **`$set: { "homepage.sections": … }`** so other `homepage.*` fields are not wiped  
   - **POST** – reset sections to `buildDefaultHomepageSections(...)`  
   - All call **`revalidatePath("/")`** after writes.

4. **Design / components**  
   - Same `SectionRenderer` + registry; no layout redesign.  
   - **`TopCategoriesGridSection`** now loads categories from **`config.categorySlugs`** when set, so multiple grids can differ.  
   - **`HeroCarouselSection` / `PromoTilesSection`**: empty **`slides` / `cards`** arrays mean “use global SiteConfig” so JSON in admin does not blank the hero by mistake.

### Files touched (high level)

- `src/lib/storefront/getHomepageConfig.ts` – export `buildDefaultHomepageSections`, persisted-layout branch  
- `src/app/api/v1/admin/homepage-sections/route.ts` – new route  
- `src/app/(admin)/admin/cms/homepage/page.tsx` + `HomepageSectionsEditor.tsx` – UI  
- `src/app/(admin)/layout.tsx` – nav link  
- `src/components/store/sections/TopCategoriesGridSection.tsx`, `HeroCarouselSection.tsx`, `PromoTilesSection.tsx` – behavior above  

`npm run lint` passes (existing 3 warnings only). **`npm run build` succeeds.**

**Note:** Until you **Save** or **Reset to default layout**, `homepage.sections` may be empty and the site keeps the old automatic layout. To start editing from that stack, use **Reset to default layout**, then adjust and **Save layout**. Tab products / week-deal IDs still come from `SiteConfig.homepage.featuredTabs` / `weekDeals` in Mongo unless you override per section where the UI supports it (e.g. `tabIds`, `productIds`).

---

**User**

this is too messy not worked,
i want,
currently home page layout is there and we can edit or customizelike shopify


---

**Cursor**

Redesigning the homepage admin into a Shopify-style two-panel editor: grouped sidebar, drag-and-drop reordering, and a live storefront preview. Checking dependencies and the current editor.



Installing drag-and-drop libraries and rebuilding the editor into a Shopify-style split view: section rail with drag handles, grouped labels, and a live storefront preview.



Writing the redesigned editor: Shopify-style rail, drag-and-drop, dialog editor, and live preview.



Here is what changed.

### Shopify-style experience
- **Split view**: **Left** = section rail (light rail, cards, clear typography). **Right** = **live storefront iframe** (`/`) so you edit against the real layout.
- **Preview cookie**: On this screen we set `cms_store_preview=1` so admins can see the store (same behavior as before) while staying in the admin shell.
- **Drag and drop**: Sections reorder with **`@dnd-kit`** using the **grip** handle (not accidental drags; 8px activation distance).
- **Grouped labels**: Small **Header** / **Home page** / **Footer** labels above the first matching block, similar to Shopify’s structure.
- **Per section**: Tap the **row** (or pencil) to open a **modal** for settings instead of a long form under the table.
- **Controls**: **On/Off** on the rail, **duplicate**, **delete**, **Add** with a proper **Select**, top **Save / Reload data / Reset layout**, and **Refresh preview** for the iframe.

### Dependencies
- Added **`@dnd-kit/core`**, **`@dnd-kit/sortable`**, **`@dnd-kit/utilities`** for sorting.

### Files
- `HomepageSectionsEditor.tsx` – full UI rewrite (still uses `/api/v1/admin/homepage-sections` and the same section model).
- `page.tsx` – shorter page chrome.
- `layout.tsx` – sidebar label **Homepage** (was “Homepage sections”).

### Notes
- **Save** still writes the full section list; **Refresh preview** (or Save) reloads the iframe so you see updates after revalidation.
- True “click a block in the preview to select it” would need extra postMessage / overlay work; this version is **rail + preview**, which matches most of the Shopify workflow without changing the storefront.

`npm run lint` and **`npm run build`** both succeed.

---

**User**

the section is not editable and dublicatable

---

**Cursor**

Checking the editor UI: verifying duplicate/edit behavior and replacing raw JSON hero editing with a form-based slide editor.



Fixing three issues: (1) making Duplicate and Edit obvious with labeled actions under each card; (2) replacing raw JSON for Hero and Promo with form fields that update immediately (no blur); (3) syncing JsonConfigTextarea when we keep it for optional advanced — and flushing slide edits on dialog close.



Here is what was wrong and what we changed.

### Why it felt “not editable”
Hero (and promo) used a **JSON textarea** that only applied changes **on blur**. In a **Radix dialog**, focus often never leaves the field the way you expect, so edits looked stuck or lost. It was also hard to use compared to normal fields.

### Fix: real form editors
- **Hero** → **Slides** are edited with normal inputs: title, subtitle, button label, link, image URL. **Add slide / Remove / Move up / Move down** update state **immediately** (no blur).
- **Promo tiles** → same style for **cards** (title, subtitle, link, image).
- Existing data is still read correctly: old keys like `cta`, `link`, and `image` are mapped into `ctaLabel`, `ctaHref`, and `imageUrl`.

### Why “Duplicate” was hard to use
Duplicate only appeared as a **small copy icon** on a narrow rail, so it was easy to miss.

### Fix: clear actions on every block
Under each section card there is now a full-width row with text actions: **Edit · Duplicate · Remove** (the icons on the right are still there).

`npm run lint` and **`npm run build`** both pass.

After pulling the update, open **Homepage** → **Hero** → you should see the slide list editor; use **Duplicate** under the card or the copy icon to clone a section, then **Save** when you are done.

---

**User**

change clor this is not visible,
when admin enter in Homepage through admin dashboard show full homepage remove admin cms sidebar show only back button to return sidebar

---

**Cursor**

Improving contrast for inputs and buttons, and adding a full-width homepage editor that hides the admin sidebar and shows a Back control. Reading the admin layout and global styles.



Adding a client `AdminChrome` that hides the sidebar on the homepage editor route, and fixing input/button contrast (including forcing light color-scheme in the editor).



Here is what was implemented.

### 1. **Readable text and buttons**
- **Cause:** `globals.css` uses `@media (prefers-color-scheme: dark)`, so `bg-background` / `text-foreground` on outline buttons and inputs could end up **dark-on-dark** in the admin UI.
- **Changes:**
  - Shared **`FORM_CONTROL`** class: `bg-white`, **`text-zinc-900`**, **`placeholder:text-slate-500`** on all relevant inputs, textareas, number fields, category `<select>`, hero slide fields, and promo card fields.
  - **`BTN_OUTLINE_SOLID`** on outline actions: white background, **dark text**, clear hover (`Reload data`, `Reset layout`, `Refresh preview`, slide/card **Add** / **Move** / **Done**, etc.).
  - **Save** / **Save all** use explicit **`bg-blue-600 text-white`**.
  - Editor shell and **dialog** use **`[color-scheme:light]`** and **`text-zinc-900`** so native controls stay in a light scheme even when the OS prefers dark.

### 2. **Full-width homepage editor + back only**
- New client shell: **`src/app/(admin)/AdminChrome.tsx`** (used from **`layout.tsx`**).
- On **`/admin/cms/homepage`** (with or without a trailing `/`):
  - **No** dark CMS sidebar and **no** “+ Add Product” top bar.
  - **Thin top bar:** **Back to dashboard** → `/admin/dashboard` (short **“Back”** on small screens) and the label **Homepage editor**.
  - Main area is **full width** for the editor + preview.
- All **other** `/admin/*` routes keep the **original sidebar + top bar**.

`npm run lint` and **`npm run build`** both succeed.

---

**User**

i add new text and saved it not worked

