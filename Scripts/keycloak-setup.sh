#!/bin/sh
set -e

REALM="${REALM:-myapp}"
CLIENT_ID="${CLIENT_ID:-testapp}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
CLIENT_SECRET_OUTPUT="${CLIENT_SECRET_OUTPUT:-/secrets/${CLIENT_ID}.txt}"

/opt/keycloak/bin/kcadm.sh config credentials \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD"

/opt/keycloak/bin/kcadm.sh create realms -s realm="$REALM" -s enabled=true 2>/dev/null || true

/opt/keycloak/bin/kcadm.sh create clients -r "$REALM" \
  -s clientId="$CLIENT_ID" \
  -s enabled=true \
  -s publicClient=false \
  -s 'redirectUris=["*"]' \
  -i 2>/dev/null || true

CLIENT_UUID=$(/opt/keycloak/bin/kcadm.sh get clients -r "$REALM" -q clientId="$CLIENT_ID" --fields id --format csv --noquotes | tail -n 1)

RESPONSE=$(/opt/keycloak/bin/kcadm.sh get "clients/$CLIENT_UUID/client-secret" -r "$REALM")
SECRET=$(echo "$RESPONSE" | sed -n 's/.*"value"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

mkdir -p "$(dirname "$CLIENT_SECRET_OUTPUT")"
printf '%s' "$SECRET" > "$CLIENT_SECRET_OUTPUT"
echo "Secret saved to $CLIENT_SECRET_OUTPUT"
