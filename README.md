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
- `Source/Plugins`: Fastify plugins for cookies, JWT, Zod type provider, OAuth2 and response headers.
- `Source/Routes`: public HTTP API (`/health`, `/verify`).
- `Source/Lib`: logging.
- `Source/Types`: local shared typing helpers.

Detailed architecture notes, request flow, strengths and weaknesses are documented in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

AI-oriented project context is documented in [docs/AI_CONTEXT.md](./docs/AI_CONTEXT.md), and coding-agent instructions are documented in [AGENTS.md](./AGENTS.md).

Local setup details are documented in [docs/LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md).

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

Local development, Docker demo setup, and development-only environment variables are documented in [docs/LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md).

## Environment Variables

Minimum runtime variables for starting the service:

- `SECRET`: 64-character hex key used for JWT signing and OAuth state protection.
- `OPENID_CLIENT_ID`: OpenID client id.
- `OPENID_WELL_KNOWN`: issuer discovery URL.
- `OPENID_SECRET` or `OPENID_SECRET_FILE`: provider client secret or a path to a file that contains it.

Useful common options:

- `OPENID_EXTERNAL_ORIGIN`: rewrites the provider origin in browser redirects when discovery happens through an internal URL.
- `REDIRECT_URI`: callback path, default `/callback`.
- `AUTH_COOKIE_NAME`: JWT cookie name, default `auth`.
- `SESSION_COOKIE_NAME`: OAuth `state` cookie name, default `auth-session`.
- `LISTEN_TYPE`: `local` or `all`, default `local`.

For the complete application runtime reference, see [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md).

## Reverse Proxy And Traefik

`AuthMiddleware` is designed to sit behind a reverse proxy and expects the usual forwarded request metadata. The primary integration target is Traefik ForwardAuth.

Typical request flow with Traefik:

1. The browser requests a protected upstream service through Traefik.
2. Traefik calls `AuthMiddleware` on `/verify` before proxying the upstream request.
3. If `AuthMiddleware` returns `204`, Traefik lets the request continue and forwards `x-user` to the upstream.
4. If the user is not authenticated, `AuthMiddleware` redirects the browser into the OpenID Connect flow.
5. After the callback completes, the browser is redirected back to the protected app root and the next ForwardAuth check succeeds.

Traefik must pass the forwarded headers that the middleware uses to reconstruct the original browser request:

- `x-forwarded-method`
- `x-forwarded-proto`
- `x-forwarded-host`
- `x-forwarded-uri`
- `x-forwarded-for`

### Minimal Traefik Setup

The middleware itself should be reachable by Traefik on the internal network, for example as `http://auth-middleware:3000/verify`.

Minimal labels for the auth middleware service:

```yaml
labels:
  - traefik.enable=true
  - traefik.http.middlewares.auth-middleware.forwardauth.address=http://auth-middleware:3000/verify
  - traefik.http.middlewares.auth-middleware.forwardauth.trustForwardHeader=true
```

Minimal labels for a protected upstream service:

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.app.rule=PathPrefix(`/`)
  - traefik.http.routers.app.entrypoints=web
  - traefik.http.routers.app.middlewares=auth-middleware
  - traefik.http.services.app.loadbalancer.server.port=80
```

This is the same pattern used by the local `docker-compose.yml`.

### Public Auth Origin

If the OpenID provider is discovered through an internal URL but the browser must be redirected to a different public URL, set `OPENID_EXTERNAL_ORIGIN`.

Example:

- internal discovery URL: `http://keycloak:8080/realms/myapp/.well-known/openid-configuration`
- public browser-facing auth URL: `http://localhost:81`

In that case:

```dotenv
OPENID_WELL_KNOWN=http://keycloak:8080/realms/myapp/.well-known/openid-configuration
OPENID_EXTERNAL_ORIGIN=http://localhost:81
```

### Proxy Notes

- Keep the callback route `REDIRECT_URI` reachable through the same public Traefik entrypoint and host that started the login flow.
- If Traefik itself is behind another reverse proxy or load balancer, make sure forwarded headers stay consistent all the way through.
- For hybrid local development details, including `AUTH_FORWARD_URL`, see [docs/LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md).
- Direct requests to `/verify` without proxy headers are not a supported browser flow. Use Traefik for end-to-end auth testing.

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
