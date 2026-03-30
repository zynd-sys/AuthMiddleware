# AI Context

## Project Summary

`AuthMiddleware` is a standalone Node.js service built with Fastify. It is designed to sit behind Traefik and handle authentication through the ForwardAuth pattern.

Primary responsibility:

- authenticate browser users via OpenID Connect;
- issue and verify the service's own JWT cookie;
- return `x-user` for trusted upstream services.

Non-goals:

- no user database;
- no admin panel;
- no domain business logic;
- no dependency on the original monorepo.

## Core Request Flow

1. Traefik sends a request to `GET /verify`.
2. The service checks the auth JWT cookie.
3. If valid, it responds with `204` and sets `x-user`.
4. If invalid or missing, it redirects the browser to the OpenID provider.
5. The provider redirects back to `REDIRECT_URI`.
6. The service exchanges the auth code, gets user info, signs its own JWT cookie, and redirects to `/`.

## Key Files

- `Source/Routes/verify.ts`: main authentication flow.
- `Source/Plugins/oauth2.ts`: OpenID/OAuth2 Fastify plugin registration.
- `Source/Config/env.ts`: runtime env schema.
- `Source/Config/readConfig.ts`: standalone config loader.
- `Dockerfile`: standalone image build.
- `.github/workflows/docker-publish.yml`: publish image to GitHub Container Registry.

## Important Constraints

- Keep the project standalone and portable.
- Avoid private or workspace-only dependencies.
- Keep auth behavior explicit and easy to audit.
- Do not commit real secrets.
- Preserve compatibility with the current Docker Compose demo setup.

## Useful Commands

```bash
npm install
npm run typecheck
npm run lint
npm run build
docker compose config
```

## Environment Model

Minimum runtime variables:

- `SECRET`
- `OPENID_CLIENT_ID`
- `OPENID_SECRET` or `OPENID_SECRET_FILE`
- `OPENID_WELL_KNOWN`

Extended environment reference:

- `docs/ENVIRONMENT.md`

## Coding Guidance

- Prefer small helper functions instead of growing `verify.ts` inline.
- Prefer Zod validation at all external boundaries.
- Prefer local, obvious abstractions over framework-heavy layering.
- If adding features, document them in `README.md` and `docs/ARCHITECTURE.md`.
- If changing runtime behavior, keep Docker and GitHub Actions in sync.
