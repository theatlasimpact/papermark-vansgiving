#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${TEAM_ID:-}" ]]; then
  echo "TEAM_ID is required (export TEAM_ID=<team id>)."
  exit 1
fi

DOMAIN="${DOMAIN:-sponsor.joinvansgiving.com}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_HEADER="${SESSION_COOKIE:+Cookie: ${SESSION_COOKIE}}"

if [[ -z "${SESSION_COOKIE:-}" ]]; then
  echo "SESSION_COOKIE is not set. Export a NextAuth session cookie to hit authenticated endpoints." >&2
fi

echo "Checking limits for TEAM_ID=${TEAM_ID}..."
curl -sS -H "${COOKIE_HEADER}" "${BASE_URL}/api/teams/${TEAM_ID}/limits" | jq '{links, documents, domains, datarooms, usage}'

echo "Checking domain verification for ${DOMAIN}..."
curl -sS -H "${COOKIE_HEADER}" "${BASE_URL}/api/teams/${TEAM_ID}/domains/${DOMAIN}/verify" | jq '{status, response: {domain: .response.domainJson.name, verified: .response.domainJson.verified}}'

echo "If upload preview testing is needed:"
echo "1) Ensure a Trigger.dev runner is active."
echo "2) Upload a PDF in the UI; the preview should render or surface the 'Open original file' button if processing fails."
