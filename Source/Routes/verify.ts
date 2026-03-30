import type { FastifyRequest } from 'fastify';

import { z } from 'zod';

import { AppConfig } from '../Config/app.config';
import type { FastifyPluginAsyncWithTypeProvider } from '../Types/FastifyPluginAsyncWithTypeProvider';
import { authJwtPayloadSchema, type AuthJWTPayload } from './auth.shared';

const verifyHeadersSchema = z.object({
	'x-forwarded-method': z.string(),
	'x-forwarded-proto': z.string(),
	'x-forwarded-host': z.string(),
	'x-forwarded-uri': z.string(),
	'x-forwarded-for': z.string(),
});

const readJwtPayload = async (req: FastifyRequest): Promise<AuthJWTPayload | null> => {
	try {
		const payload = await req.jwtVerify<AuthJWTPayload>();
		return authJwtPayloadSchema.parse(payload);
	} catch {
		return null;
	}
};

const verify: FastifyPluginAsyncWithTypeProvider = async (fastify) => {
	fastify.route({
		url: '/verify',
		method: 'GET',
		schema: {
			description: 'app auth verify',
			headers: verifyHeadersSchema,
		},
		async handler(req, reply) {
			const jwtToken = await readJwtPayload(req);

			if (jwtToken?.userId) {
				reply.header('x-user', jwtToken.userId);
				reply.header('x-user-username', jwtToken.username ?? jwtToken.userId);
				return reply.code(204).send();
			}

			verifyHeadersSchema.parse(req.headers);

			let redirectURI = await fastify.customOAuth2.generateAuthorizationUri(
				req,
				reply,
			);

			if (AppConfig.openidExternalOrigin) {
				const parsedRedirectURI = new URL(redirectURI);
				redirectURI = redirectURI.replace(parsedRedirectURI.origin, AppConfig.openidExternalOrigin);
			}

			return reply.redirect(redirectURI, 302);
		},
	});
};

export default verify;
