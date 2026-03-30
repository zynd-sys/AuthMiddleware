import { readFile } from 'node:fs/promises';

import oauth2, { type OAuth2Namespace } from '@fastify/oauth2';
import type { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { AppConfig } from '../Config/app.config';
import { buildReturnToCookieOptions } from '../Routes/auth.shared';

const resolveClientSecret = async () => {
	if (AppConfig.openidSecret) return AppConfig.openidSecret;
	if (!AppConfig.openidSecretFile) throw new Error('OPENID_SECRET_FILE is not configured');

	return (await readFile(AppConfig.openidSecretFile, { encoding: 'utf-8' })).trim();
};

const buildCallbackUri = (req: FastifyRequest) => {
	const proto = req.headers['x-forwarded-proto'] ?? 'https';
	const host = req.headers['x-forwarded-host'] ?? req.host;

	return `${proto}://${host}${AppConfig.redirectUri}`;
};

export const OAuth2Plugin = fp(async (server) => {
	await server.register(oauth2, {
		name: 'customOAuth2',
		scope: ['openid', 'profile', 'email'],
		credentials: {
			client: {
				id: AppConfig.openidClientId,
				secret: await resolveClientSecret(),
			},
		},
		callbackUri: buildCallbackUri,
		discovery: {
			issuer: AppConfig.openidWellKnown.toString(),
		},
		cookie: buildReturnToCookieOptions(),
		redirectStateCookieName: AppConfig.sessionCookieName,
	});
});

declare module 'fastify' {
	interface FastifyInstance {
		customOAuth2: OAuth2Namespace;
	}
}

export default OAuth2Plugin;
