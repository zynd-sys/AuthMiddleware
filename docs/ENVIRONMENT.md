# Environment Reference

This document lists the application runtime environment variables used by the service itself.

## Application Runtime

Required:

- `SECRET`: 64-character hex key used for JWT signing and OAuth state protection.
- `OPENID_CLIENT_ID`: OpenID client id.
- `OPENID_WELL_KNOWN`: OpenID Connect discovery URL.
- `OPENID_SECRET` or `OPENID_SECRET_FILE`: provider client secret or a path to a file that contains it.

Optional:

- `PORT`: HTTP port for the Fastify server. Default: `3000`.
- `NODE_ENV`: `production` or `development`. Default: `production`.
- `LISTEN_TYPE`: `local` or `all`. Default: `local`.
- `LOG_LEVEL`: Pino log level. Defaults to `debug` in development and `info` otherwise.
- `SERVER_NAME`: value used for the response `server` header. Default: `auth-middleware`.
- `VERSION`: application version string. Default: `unknown`.
- `OPENID_EXTERNAL_ORIGIN`: rewrites the provider origin in browser redirects when discovery happens through an internal URL.
- `AUTH_COOKIE_NAME`: JWT cookie name. Default: `auth`.
- `SESSION_COOKIE_NAME`: OAuth `state` cookie name. Default: `auth-session`.
- `COOKIE_DOMAIN`: optional cookie domain shared by the protected app and callback hosts, for example `example.com`.
- `COOKIE_SECURE`: sets the `Secure` flag for both the auth JWT cookie and OAuth state cookie. Default: `false` in development and `true` otherwise.
- `REDIRECT_URI`: callback path. Default: `/oauth/callback`.
- `CONFIG_PATH`: optional path to a JSON config file. Values from that file are merged into the normalized runtime config after env loading.

Notes:

- `OPENID_SECRET` takes precedence over `OPENID_SECRET_FILE` when both are set.
- `CONFIG_PATH` is useful when a deployment prefers mounting structured config instead of passing all values through env vars.

Local development and Docker demo variables are documented in [docs/LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md).
