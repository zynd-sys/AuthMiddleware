# AuthMiddleware

`AuthMiddleware` is a standalone Fastify service that works as a Traefik ForwardAuth endpoint and delegates login to an OpenID Connect provider such as Keycloak.

## What The Project Does

The service sits in front of protected applications. When Traefik forwards a request to `/verify`, the middleware:

1. Checks whether the user already has a valid JWT in an HTTP-only cookie.
2. If the cookie is valid, returns `204` and forwards the user identifier in the `x-user` header.
3. If the cookie is missing, starts the OpenID Connect authorization flow.
4. Handles the callback on `REDIRECT_URI`, exchanges the code for a token, reads the user profile, signs its own JWT, stores it in a cookie, and redirects the user back to the protected app.

## Architecture

The service is intentionally small and built from a few explicit layers:

- `Source/Apps`: server bootstrap and startup.
- `Source/Config`: environment parsing and runtime config.
- `Source/Plugins`: Fastify plugins for cookies, JWT, secure session, Zod type provider, OAuth2 and response headers.
- `Source/Routes`: public HTTP API (`/health`, `/verify`).
- `Source/Lib`: logging.
- `Source/Types`: local shared typing helpers.

Detailed architecture notes, request flow, strengths and weaknesses are documented in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

AI-oriented project context is documented in [docs/AI_CONTEXT.md](./docs/AI_CONTEXT.md), and coding-agent instructions are documented in [AGENTS.md](./AGENTS.md).

## Refactoring Done

The service was refactored to be GitHub-ready and independent from the monorepo it came from:

- removed internal dependencies on `@zynd-sys/*` packages;
- replaced shared config helpers and shared types with local equivalents;
- extracted OAuth2 registration into its own plugin;
- simplified bootstrap by introducing `buildServer()`;
- fixed the broken `/verify` flow and JWT typing;
- replaced the monorepo-only Docker build with a standalone multi-stage Dockerfile;
- added GitHub Actions for CI and publishing the Docker image to `ghcr.io`;
- added local docs and `.env.example`.

## Strengths And Weaknesses

Short summary:

- Strengths: small surface area, clear auth responsibility, simple Fastify composition, Traefik-friendly integration, no database dependency in the middleware itself.
- Weaknesses: only one auth strategy, no automated tests yet, callback flow still depends on correct proxy headers, and the service currently exposes only the user id instead of a richer identity contract.

Full review is in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Local Development

Install dependencies:

```bash
npm install
```

Create your local env file:

```bash
cp .env.example .env
```

Run locally:

```bash
npm run dev
```

Run in Docker with Keycloak and Traefik:

```bash
docker compose up --build
```

## Environment Variables

Required runtime variables:

- `SECRET`: 64-character hex key used for JWT and secure-session signing.
- `OPENID_CLIENT_ID`: OpenID client id.
- `OPENID_SECRET` or `OPENID_SECRET_FILE`: client secret or a path to the secret file.
- `OPENID_WELL_KNOWN`: issuer discovery URL.

Useful optional variables:

- `OPENID_EXTERNAL_ORIGIN`: rewrites the provider origin in redirects when the provider is behind another public URL.
- `AUTH_COOKIE_NAME`: JWT cookie name, default `auth`.
- `SESSION_COOKIE_NAME`: session cookie used by the OAuth flow, default `auth-session`.
- `REDIRECT_URI`: callback path, default `/callback`.
- `LISTEN_TYPE`: `local` or `all`.

## Docker Image

Build locally:

```bash
docker build -t auth-middleware:local .
```

The included workflow [docker-publish.yml](./.github/workflows/docker-publish.yml) publishes the image to:

```text
ghcr.io/<owner>/<repo>
```

It runs on pushes to `main`, tags like `v1.1.0`, and manual dispatch.

## Publishing As A Standalone GitHub Repository

1. Move the contents of this folder into the root of a new repository.
2. Copy `.env.example` and fill real secrets through GitHub secrets or deployment env vars.
3. Push to GitHub.
4. Enable Actions and Packages permissions for the repository.
5. The Docker workflow will publish the image to `ghcr.io/<owner>/<repo>`.

## Security Note

The tracked `.env` files were sanitized for publication, but previously committed secrets should still be rotated if this directory was ever shared outside a trusted environment.
