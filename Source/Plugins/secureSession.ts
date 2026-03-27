import { Buffer } from 'node:buffer';

import fp from 'fastify-plugin';

import { AppConfig } from '../Config/app.config';

export const SecureSessionPlugin = fp(async (server) => {
	await server.register(import('@fastify/secure-session'), {
		sessionName: 'session',
		cookieName: AppConfig.sessionCookieName,
		key: Buffer.from(AppConfig.secret, 'hex'),
		cookie: {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !AppConfig.isDevelopment,
		},
	});
});

export default SecureSessionPlugin;
