# Papermark on Vercel (Custom Domain) – Upload & Public View Troubleshooting

This guide summarizes the most common causes of failed uploads or missing public document views when running Papermark on Vercel with a custom domain (e.g., `sponsor.joinvansgiving.com`).

## 1) Production diagnostics checklist

### Domain & routing
- Confirm the Vercel project domain and custom CNAME both resolve to the deployment and that `NEXT_PUBLIC_BASE_URL`/`NEXT_PUBLIC_MARKETING_URL` point to the same host (including `https`).
- Ensure `NEXT_PUBLIC_APP_BASE_HOST` is the bare host (no protocol) that matches the deployed domain.
- In Vercel, re-issue the deployment if the custom domain was added after the last build so ISR/rewrites include it.

### Storage backend readiness (uploads)
- Pick one upload transport and configure **all required variables** for it (see section 3). Mixed/partial config often yields `write after end` or 400 responses.
- Vercel Blob: `BLOB_READ_WRITE_TOKEN` must exist and the Browser Upload API has to be enabled on the project. Also set `NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST` to the Vercel Blob host.
- S3: bucket must allow `PutObject` and `GetObject`; if using CloudFront, the distribution domain and signing keys must be present. Mismatch between region/endpoint and bucket DNS is a common 403/timeout cause.
- Supabase/local dev: ensure the storage adapter actually matches `NEXT_PUBLIC_UPLOAD_TRANSPORT`.

### API/runtime expectations
- `pages/api/file/browser-upload.ts` expects the raw request stream. If Next.js body parsing or an early response closes the stream, Node will throw `ERR_STREAM_WRITE_AFTER_END`. Keep `bodyParser` enabled only when the handler supports it; otherwise, disable it for this route (see patch snippet below).
- Make sure only `POST` hits the upload route; guard with a method check to avoid double responses from OPTIONS/HEAD.
- When using edge runtime for other routes, force this upload route to `runtime: "nodejs"` so streaming works consistently.

### Public document visibility
- Verify that the document record stores a resolvable `data` field (Blob URL or S3 key) and a `DocumentStorageType` matching the configured backend. Mixed types will render blank public pages.
- If behind a CDN (CloudFront), confirm the signed URL generation uses the same domain as the bucket and that clocks are in sync.
- For Vercel Blob, the returned URL must be public (`access: "public"`), otherwise the public dashboard renders but individual doc fetches 403.

### Authentication/session
- `handleUpload` requires a valid NextAuth session. Confirm cookies include the correct domain and `NEXTAUTH_URL` uses the deployed hostname over HTTPS.
- Custom domains need matching `NEXTAUTH_URL` and `NEXT_PUBLIC_BASE_URL`; otherwise uploads succeed locally but fail once routed through Vercel.

## 2) Quick endpoint and storage tests

### Curl smoke test for the upload API (server-side)
```bash
# Replace host and token values
curl -i -X POST "https://sponsor.joinvansgiving.com/api/file/browser-upload" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<valid_token>" \
  -d '{"pathname":"/test.pdf","clientPayload":"{}"}'
```
Expected: `200` with JSON token payload. If you get 400/500 with `write after end`, re-check body parsing/runtime notes below.

### Local upload cycle against storage
```bash
# Create a 1MB test file
head -c 1048576 </dev/urandom > /tmp/test.bin

# S3 direct upload (presigned PUT)
aws s3 cp /tmp/test.bin s3://$NEXT_PRIVATE_UPLOAD_BUCKET/test.bin --region "$NEXT_PRIVATE_UPLOAD_REGION"

# Vercel Blob direct upload (requires BLOB_READ_WRITE_TOKEN)
# npm install -g @vercel/blob-cli
vercel blob put /tmp/test.bin --token "$BLOB_READ_WRITE_TOKEN"
```
If either command fails, fix IAM/Blob permissions before retrying Papermark uploads.

## 3) Environment variable template (minimal production set)

### Core app / domain
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://sponsor.joinvansgiving.com`
- `NEXT_PUBLIC_BASE_URL=https://sponsor.joinvansgiving.com`
- `NEXT_PUBLIC_MARKETING_URL=https://sponsor.joinvansgiving.com`
- `NEXT_PUBLIC_APP_BASE_HOST=sponsor.joinvansgiving.com`
- `SELF_HOSTED=false` and `NEXT_PUBLIC_SELF_HOSTED=false` for Vercel SaaS setup

### Database & auth
- `POSTGRES_PRISMA_URL`, `POSTGRES_PRISMA_URL_NON_POOLING`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (or other NextAuth provider secrets)

### Upload backend (choose one)
**Vercel Blob**
- `NEXT_PUBLIC_UPLOAD_TRANSPORT=vercel`
- `BLOB_READ_WRITE_TOKEN`
- `NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST=<blob_store_id>.public.blob.vercel-storage.com`

**AWS S3 (or compatible)**
- `NEXT_PUBLIC_UPLOAD_TRANSPORT=s3`
- `NEXT_PRIVATE_UPLOAD_BUCKET`
- `NEXT_PRIVATE_UPLOAD_REGION` (e.g., `us-east-1`)
- `NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID`
- `NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY`
- Optional CDN/signing: `NEXT_PRIVATE_UPLOAD_DISTRIBUTION_DOMAIN`, `NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_ID`, `NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_CONTENTS`, `NEXT_PRIVATE_UPLOAD_ENDPOINT`

### Other required services
- `RESEND_API_KEY`
- `TINYBIRD_TOKEN`
- `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
- `PROJECT_ID_VERCEL`, `TEAM_ID_VERCEL`, `AUTH_BEARER_TOKEN` (for custom domain automation)
- `NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY`

## 4) Hardening the upload route against stream errors

Add the following guard/config to `pages/api/file/browser-upload.ts` if you see `ERR_STREAM_WRITE_AFTER_END` or duplicate responses:

```ts
export const config = {
  api: {
    bodyParser: false, // keep raw stream for handleUpload
  },
  runtime: "nodejs", // avoid edge runtime for streaming
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).setHeader("Allow", "POST").end("Method Not Allowed");
  }

  try {
    const body = req.body as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      // ...existing token logic...
    });
    return res.status(200).json(jsonResponse);
  } catch (error) {
    // Log once to avoid multiple writes
    console.error("browser-upload error", error);
    return res.status(400).json({ error: (error as Error).message });
  }
}
```

Deploy after adding config so Vercel rebuilds the function with the correct runtime and body handling.

## 5) Public document link validation

- After an upload, check the document record in the database: `storageType` should match the configured transport and `data` should be a valid Blob URL or S3 key.
- For Vercel Blob, open the `blob.url` in a private window; it should be publicly reachable. For S3+CloudFront, fetch the signed URL from the app and confirm HTTP 200.
- Use `curl -I https://<distribution>/path/to/file.pdf` to confirm the CDN/bucket serves the object without authentication when expected.

## 6) Concrete debugging steps

1. Re-validate environment variables against the template above; redeploy after edits so Vercel regenerates serverless functions.
2. Tail the Vercel function logs for `/api/file/browser-upload` and `/api/file/s3/*` to spot 4xx from storage providers.
3. Test uploads locally with `npm run dev` using the same env vars to reproduce; if it works locally but not on Vercel, check domain/`NEXTAUTH_URL` cookie scope.
4. Temporarily switch `NEXT_PUBLIC_UPLOAD_TRANSPORT` to `s3` (with valid creds) to isolate whether Vercel Blob is failing.
5. Verify file permissions/ACLs on the bucket/blob and confirm uploads appear in the storage console after attempts.
6. If using CloudFront, invalidate the distribution after changing bucket paths to avoid stale 403s.
7. Recreate the deployment (not just re-run) when toggling between Vercel Blob and S3 so build-time config and Next.js rewrites update.

Following this checklist should surface missing env configuration, storage permission issues, or Next.js stream handling problems that cause failed uploads and invisible public documents.
