# Local Development

This project supports two local development loops:

- full Docker demo, where `auth-middleware` also runs in a container;
- hybrid development, where Docker runs Traefik, Keycloak, Postgres and the demo app, while `auth-middleware` runs from source on the host.

The hybrid loop is the most useful option when changing most application code because it keeps the browser flow realistic and gives you instant feedback from `tsx`.

## Requirements

- Node.js 22+
- npm 11+
- Docker with Compose support

## Local Files

Create a local env file before starting:

```bash
cp .env.example .env
```

The demo stack will also create `./secrets/testapp.txt` during Keycloak bootstrap. The repository keeps the `secrets/` directory tracked so the first startup has a stable bind-mount target.

## Local Development Variables

The local Docker demo and helper scripts use variables that are separate from the service runtime variables documented in [docs/ENVIRONMENT.md](./ENVIRONMENT.md).

### Docker Demo Variables

- `AUTH_FORWARD_URL`: Traefik ForwardAuth target. Default: `http://auth-middleware:3000/verify`.
- `COOKIE_SECURE`: sets the `Secure` flag for both auth cookies. Use `false` for local `http://localhost` development. Default in the demo config: `false`.
- `PG_USER`: Postgres user for the local Keycloak database.
- `PG_PASS`: Postgres password for the local Keycloak database.
- `PG_DB`: Postgres database name for the local Keycloak database.
- `KEYCLOAK_ADMIN`: local Keycloak admin username.
- `KEYCLOAK_ADMIN_PASSWORD`: local Keycloak admin password.

### Keycloak Bootstrap Variables

These are used by `Scripts/keycloak-setup.sh`:

- `REALM`: Keycloak realm to create. Default: `myapp`.
- `CLIENT_ID`: Keycloak client id to create. Default: `testapp`.
- `KEYCLOAK_URL`: Keycloak base URL for admin bootstrap. Default: `http://keycloak:8080`.
- `CLIENT_SECRET_OUTPUT`: file path where the generated client secret is written. Default: `/secrets/<CLIENT_ID>.txt`.

The bootstrap helper also requires:

- `KEYCLOAK_ADMIN`
- `KEYCLOAK_ADMIN_PASSWORD`

## Option 1: Full Docker Demo

Use this when you want the whole stack to run in containers:

```bash
docker compose up --build
```

Useful URLs:

- protected app: `http://localhost/`
- Keycloak through Traefik: `http://localhost:81/`
- Traefik dashboard: `http://localhost:9090/`

In this mode Traefik forwards auth requests to the `auth-middleware` container by default.
The public callback path `REDIRECT_URI` is also routed directly to `auth-middleware`.

## Option 2: Hybrid Local Development

Use this when you want to edit TypeScript locally and keep the auth flow running through Traefik.

1. Point Traefik at the host process by changing `AUTH_FORWARD_URL` in `.env`:

```dotenv
AUTH_FORWARD_URL=http://host.docker.internal:3000/verify
```

2. Start the supporting infrastructure and the containerized callback endpoint:

```bash
npm run dev:infra
```

3. In a second terminal, start the service on all interfaces so Docker can reach it:

```bash
npm run dev:host
```

4. Open the protected app:

```text
http://localhost/
```

Important notes:

- `npm run dev` binds to `127.0.0.1`, which is fine for direct local checks such as `/health`, but Docker containers cannot use it for ForwardAuth.
- `npm run dev:host` is required for the browser login flow because ForwardAuth still points at `host.docker.internal:3000`.
- In hybrid mode, Traefik exposes the public callback path through the containerized `auth-middleware` service, while ForwardAuth itself still points at the host process.
- Keep browser traffic going through Traefik even in hybrid mode. The public callback path must stay on the same public host as the protected app.
- If you intentionally split the callback and protected app across sibling subdomains, set `COOKIE_DOMAIN` to the shared parent domain.

## Useful Checks

Run the service directly:

```bash
curl http://127.0.0.1:3000/health
```

Validate the project:

```bash
npm run typecheck
npm run lint
npm run build
```

Inspect the effective Compose configuration:

```bash
docker compose config
```

## Resetting Back To Container Auth

When you want Traefik to use the containerized service again, restore the default value in `.env`:

```dotenv
AUTH_FORWARD_URL=http://auth-middleware:3000/verify
```

Then start the full stack again:

```bash
docker compose up --build
```
