# Atlas Impact document sharing

This app is a self-hosted copy of [Papermark](https://github.com/mfts/papermark) (AGPL-3.0). The product name people see is **Atlas Impact** / **Atlas Impact Solutions**. The goal is tracked links such as `https://share.theatlasimpact.com/mater-dei-gym-energy` for decks, quotes, spec sheets, contracts, and data rooms.

Do not point `share.theatlasimpact.com` at Vercel until you have looked at a preview. Nothing in this repo publishes that domain.

## What only Van can create

These accounts and DNS records have to be created by someone who owns the Atlas Impact email, the Vercel team, and the `theatlasimpact.com` domain. This repository does not contain those logins.

1. A **Vercel** team for Atlas Impact Solutions, with this GitHub repo imported.
2. A **Neon** Postgres database (Vercel Marketplace → Neon, or neon.tech). Use the free plan.
3. A **Vercel Blob** store on the same project.
4. A **Resend** account, and a verified sending domain.
5. DNS at the registrar for `theatlasimpact.com` (the CNAME, plus the email records Resend shows).
6. Two random secrets, generated on your machine, never committed:
   - `openssl rand -base64 32` for `NEXTAUTH_SECRET`
   - `openssl rand -base64 32` for `NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY`
   - `openssl rand -base64 32` for `NEXT_PRIVATE_VERIFICATION_SECRET`

Optional, and not needed to send the first deck: Google login, LinkedIn login, Tinybird analytics, Upstash QStash, Trigger.dev page images, Hanko passkeys.

## What it costs

| Piece | Cost for this use |
| --- | --- |
| Vercel Hobby | $0, but Hobby is only for personal, non-commercial projects. Atlas Impact Solutions is a business, so use **Vercel Pro: $20 per month** for one deploying seat. Pro includes $20 of usage credit. A Pro trial exists if you want to look at a preview before paying. |
| Neon Postgres | Free plan is enough for a handful of decks and link records. It can pause when idle. You pay only if the database outgrows the free limits. |
| Vercel Blob | A PDF deck is tiny. On Pro, storage is about $0.023 per GB and comes out of the usage credit. On Hobby, 1 GB is included, but Hobby is not the right plan for a company. |
| Resend | Free tier: 100 emails per day and 3,000 per month. That covers login links and email verification for a short fundraising send. More mail is paid. |
| Domain `theatlasimpact.com` | Already owned. The new DNS records do not add a fee at the registrar. |
| Stripe | Not used. Billing in this copy is turned off. |
| Tinybird, Trigger.dev, Upstash, Google, Hanko | Skip them. Leave those env vars empty. |

A normal month for a few partner links should be the **$20 Vercel seat**, and $0 for Neon, Blob, and Resend, unless usage leaves those free limits.

## Env vars

Set these in Vercel → Project → Settings → Environment Variables. Names only. Values stay in Vercel.

Required:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_MARKETING_URL`
- `NEXT_PUBLIC_APP_BASE_HOST` = `share.theatlasimpact.com` (no `https://`)
- `SELF_HOSTED` = `true`
- `NEXT_PUBLIC_SELF_HOSTED` = `true`
- `POSTGRES_PRISMA_URL` (pooled Neon URL)
- `POSTGRES_PRISMA_URL_NON_POOLING` (direct Neon URL)
- `POSTGRES_PRISMA_SHADOW_URL` (same value as the non-pooling URL)
- `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_UPLOAD_TRANSPORT` = `vercel`
- `NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST` (the Blob host, no `https://`)
- `RESEND_API_KEY`
- `EMAIL_FROM` = `Atlas Impact Solutions <login@share.theatlasimpact.com>`
- `EMAIL_REPLY_TO` = `van@theatlasimpact.com`
- `NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY`
- `NEXT_PRIVATE_VERIFICATION_SECRET`
- `DISABLE_DOCUMENT_PROCESSING` = `true`
- `NEXT_PUBLIC_DISABLE_DOCUMENT_PROCESSING` = `true`

For a preview before DNS is live, set `NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL`, and `NEXT_PUBLIC_MARKETING_URL` to that preview's `https://….vercel.app` URL, and set `NEXT_PUBLIC_APP_BASE_HOST` to the preview hostname without `https://`. Change them to `share.theatlasimpact.com` only when you are ready to go live. Redeploy after changing them.

`.env.example` lists the optional names as well.

## DNS (do this last)

At the registrar for `theatlasimpact.com`. Van creates these. Do not add the site CNAME until the preview looks right.

### Site

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `share` | `cname.vercel-dns.com` |

Also add `share.theatlasimpact.com` as a domain on the Vercel project. Vercel will show this same CNAME.

### Email (Resend)

In Resend, add the domain `share.theatlasimpact.com`. Resend then shows the real records. Copy those. Do not invent the DKIM value. They usually look like this:

| Type | Name | Value |
| --- | --- | --- |
| TXT | `resend._domainkey.share` | The DKIM string from the Resend dashboard |
| MX | `send.share` | The host Resend shows (priority 10) |
| TXT | `send.share` | The SPF record Resend shows |
| TXT | `_dmarc.share` | `v=DMARC1; p=none; rua=mailto:van@theatlasimpact.com` |

These email records sit on `send.share` and `resend._domainkey.share`. They do not replace the `share` CNAME, so the website and the mail can both exist.

Until Resend says the domain is verified, login links and viewer verification codes will not arrive.

## First deck

1. Deploy on Vercel from this branch. Open the preview URL. Do not add the public domain yet.
2. Sign in with `van@theatlasimpact.com`. The first login email is the Resend magic link.
3. Upload the Mater Dei PDF.
4. Create a link. The domain should be `share.theatlasimpact.com`. Type the name `mater-dei-gym-energy`.
5. Leave **Allow downloading** off. It is off unless you turn it on.
6. For a contract or anything sensitive, turn on **Require email verification**. The viewer gets a code by email. A normal deck can stay on "require email" without the extra code.
7. The public URL is `https://share.theatlasimpact.com/mater-dei-gym-energy` after DNS. On a preview, the same name opens at `https://<preview>.vercel.app/mater-dei-gym-energy`.

Page-by-page heatmaps need Tinybird and document processing. With processing left off, the PDF still opens in the viewer.

## License

The code outside `ee/` is AGPL-3.0. Copyright stays with Papermark, Inc. See `LICENSE`. Once this site is public, people who use it need a way to get this modified source. If the GitHub repo is private, publish the source or offer it on request before the live domain is announced. The `ee/` folder is Papermark's commercial license and is not what this setup relies on for sharing a deck.

## Not done from here

No Vercel project, database, Blob store, Resend key, or DNS change was created. Those need Van's accounts. A preview URL is not included until those exist.
