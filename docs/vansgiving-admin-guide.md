# Vansgiving Admin Overrides & Trigger.dev Notes

## Always-allowed sponsor domain
- `sponsor.joinvansgiving.com` is automatically accepted and marked valid for the admin user `van@theatlasimpact.com`.
- API-side validation skips DNS/Vercel checks and stores the domain as verified immediately. UI verification cards will always show **Valid Configuration** for this domain.

## Unlimited plan experience for admin
- `/api/teams/<teamId>/limits` now returns effectively unlimited values for the admin; the dashboard hides upgrade prompts and shows an **Unlimited** badge.
- Billing/plan-change UI (banners, billing nav) is suppressed for the admin override.

## Trigger.dev preview/extract runners
- Make sure `TRIGGER_API_KEY` and `TRIGGER_ENVIRONMENT_ID` are configured in Vercel/`.env` and inside Trigger.dev project secrets.
- Callback/Webhook URL should match the live deployment (e.g. `https://sponsor.joinvansgiving.com/api/trigger` or the current Vercel domain).
- **Runner checklist** (convert-pdf-to-image-route & related queues):
  1. Open Trigger.dev → Project → Queues, confirm at least one active runner assigned (status: running/connected).
  2. If no runner is attached, start a worker or re-run the Trigger.dev deploy so queues are assigned.
  3. After a runner appears, upload a new PDF in Papermark and watch the preview job complete.
  4. If previews still fail, Papermark now surfaces a button to open the original file directly.

## Environment and secret alignment
- Required keys: `TRIGGER_API_KEY`, `TRIGGER_ENVIRONMENT_ID`, and the Trigger.dev webhook/callback URL for the deployment domain.
- Keep values in sync across:
  - `.env` / `.env.local`
  - Vercel project environment variables
  - Trigger.dev project secrets and environment configuration
- Update callback URLs whenever the deployment host changes (e.g., switching from staging to `sponsor.joinvansgiving.com`).

## Validation script
- A helper script lives at `scripts/admin-validation.sh`.
- Expects `TEAM_ID`, `DOMAIN` (defaults to sponsor domain), and an authenticated `SESSION_COOKIE` (from your browser) exported in the shell.
- The script checks:
  - Limits endpoint returns high values for admin.
  - Domain verification shows `Valid Configuration`.
- Extend with a cURL upload test once a session token for file upload is available.
