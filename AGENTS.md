# AGENTS

This file is for coding agents working inside the `AuthMiddleware` repository.

## Project Intent

`AuthMiddleware` is a small standalone Fastify service that acts as a Traefik ForwardAuth endpoint and delegates browser login to an OpenID Connect provider such as Keycloak.

The project should stay:

- small;
- standalone;
- easy to publish as its own GitHub repository;
- easy to run locally with Docker Compose;
- conservative in authentication behavior.

## Source Layout

- `Source/Apps`: bootstrap and startup.
- `Source/Config`: environment validation and runtime config.
- `Source/Plugins`: Fastify plugins.
- `Source/Routes`: HTTP routes.
- `Source/Lib`: logger.
- `Source/Types`: local shared typing helpers.
- `Scripts`: local helper scripts, including Keycloak bootstrap.
- `docs`: human and AI-oriented documentation.
- `.github/workflows`: CI and Docker publishing.

## Important Runtime Behavior

- `/health` is the liveness endpoint.
- `/verify` is the main ForwardAuth endpoint.
- If a valid JWT cookie exists, the service returns `204` and sends `x-user`.
- If no valid cookie exists, the service starts the OpenID Connect authorization flow.
- If the request path matches `REDIRECT_URI`, the service exchanges the authorization code for tokens, reads the OpenID user info, signs its own JWT, stores it in a cookie, and redirects the browser back to the upstream root.

## Guardrails For Changes

- Keep the service independent from the original monorepo. Do not add `@zynd-sys/*` or other private workspace dependencies.
- Prefer local helpers over hidden shared abstractions.
- Preserve the simple plugin-based Fastify structure.
- Do not expand the scope into a full user-management service.
- Do not commit real secrets, tokens, or production URLs.
- Keep Docker build and GitHub Actions standalone so the folder can be moved into a new repository root.

## Safe Defaults

- Prefer explicit Zod validation at the edges.
- Prefer small pure helpers when route handlers grow.
- Prefer HTTP-only cookies and conservative auth defaults.
- Prefer environment-driven configuration over hard-coded values.
- Prefer minimal public surface area.

## Commands

Install dependencies:

```bash
npm install
```

Validate:

```bash
npm run typecheck
npm run lint
npm run build
```

Run locally:

```bash
npm run dev
```

Run with local infrastructure:

```bash
docker compose up --build
```

## When Editing Docs

- Keep `README.md` focused on repository consumers.
- Keep `docs/ARCHITECTURE.md` focused on architecture, strengths, weaknesses, and tradeoffs.
- Keep `docs/AI_CONTEXT.md` short, dense, and easy for LLMs to parse.

## Good Next Improvements

- Add integration tests for `/verify`.
- Forward richer identity metadata if needed, but keep the contract explicit.
- Make token and cookie TTL configurable.
- Add stricter proxy and forwarded-header hardening.
