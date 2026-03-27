import fp from 'fastify-plugin';

import { AppConfig } from '../Config/app.config';
import { oneMonth } from '../Consts/days';

export const JWTPlugin = fp(async (server) => {
	await server.register(import('@fastify/jwt'), {
		secret: AppConfig.secret,
		verify: {
			maxAge: oneMonth * 4,
		},
		cookie: {
			cookieName: AppConfig.authCookieName,
			signed: false,
		},
	});
});

export default JWTPlugin;
