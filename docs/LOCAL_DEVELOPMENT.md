# Local Development

This project supports two local development loops:

- full Docker demo, where `auth-middleware` also runs in a container;
- hybrid development, where Docker runs Traefik, Keycloak, Postgres and the demo app, while `auth-middleware` runs from source on the host.

The hybrid loop is the most useful option when changing application code because it keeps the browser flow realistic and gives you instant feedback from `tsx`.

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

## Option 2: Hybrid Local Development

Use this when you want to edit TypeScript locally and keep the auth flow running through Traefik.

1. Point Traefik at the host process by changing `AUTH_FORWARD_URL` in `.env`:

```dotenv
AUTH_FORWARD_URL=http://host.docker.internal:3000/verify
```

2. Start only the supporting infrastructure:

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
- `npm run dev:host` is required for the browser login flow because Traefik reaches the service through `host.docker.internal:3000`.
- Keep browser traffic going through Traefik even in hybrid mode. The callback flow depends on Traefik sending the usual `x-forwarded-*` headers.

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
