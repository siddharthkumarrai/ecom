# Google Search Console Setup (yadumart.in)

Use this checklist to configure Google Search Console for your Next.js store.

## 1. Add property

1. Open: https://search.google.com/search-console
2. Click **Add property**.
3. Choose one:
   - **Domain property** (`yadumart.in`) **(Recommended)**  
     Covers all subdomains/protocols.
   - **URL prefix** (`https://yadumart.in/`)  
     Simpler, but only exact prefix.

## 2. Verify ownership

### Method A: DNS (best for Domain property)

1. Copy the TXT record from Search Console.
2. Add it in your DNS provider (Cloudflare/GoDaddy/etc).
3. Wait for propagation, then click **Verify**.

### Method B: Meta tag (already wired in app)

This project supports:

```env
GOOGLE_SITE_VERIFY=your_google_verification_code
NEXT_PUBLIC_SITE_URL=https://yadumart.in
```

1. Add both vars in Vercel **Project Settings → Environment Variables**.
2. Redeploy.
3. In Search Console, choose **HTML tag** verification and verify.

## 3. Submit sitemap

Open **Indexing → Sitemaps** and submit:

```text
sitemap.xml
```

Expected live URL:

```text
https://yadumart.in/sitemap.xml
```

## 4. Confirm robots.txt

Check:

```text
https://yadumart.in/robots.txt
```

It should allow crawling and point to your sitemap.

## 5. Run first indexing checks

1. Use **URL inspection** for:
   - `https://yadumart.in/`
   - a product page
   - a category page
2. Click **Request indexing** for important pages.

## 6. Monitor health

Track these sections weekly:

- **Pages** (index coverage issues)
- **Core Web Vitals**
- **Enhancements / Rich results**
- **Manual actions & Security**

## Troubleshooting

- **“Couldn’t fetch sitemap”**: verify `https://yadumart.in/sitemap.xml` opens in browser and returns 200.
- **Verification fails**: re-check env var value and redeploy; for DNS, wait longer for propagation.
- **Indexed page count is 0**: submit sitemap, inspect key URLs, and wait for recrawl (can take time).

