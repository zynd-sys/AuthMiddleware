import { z } from 'zod';

import { AppConfig } from '../Config/app.config';
import type { FastifyPluginAsyncWithTypeProvider } from '../Types/FastifyPluginAsyncWithTypeProvider';
import {
	buildAuthCookieOptions,
	buildRootRedirectUrl,
	openIdUserInfoSchema,
	resolvePublicRequestOrigin,
	type AuthJWTPayload,
} from './auth.shared';

const oauthCallbackQuerySchema = z.object({
	code: z.string().min(1).optional(),
	state: z.string().min(1).optional(),
	error: z.string().min(1).optional(),
	error_description: z.string().optional(),
}).passthrough();

const oauthCallback: FastifyPluginAsyncWithTypeProvider = async (fastify) => {
	fastify.route({
		url: AppConfig.redirectUri,
		method: 'GET',
		schema: {
			description: 'openid connect authorization callback',
			querystring: oauthCallbackQuerySchema,
		},
		async handler(req, reply) {
			const query = oauthCallbackQuerySchema.parse(req.query);

			if (query.error) {
				throw fastify.httpErrors.unauthorized(query.error_description ?? query.error);
			}

			if (!query.code || !query.state) {
				throw fastify.httpErrors.badRequest('Missing authorization code or state');
			}

			const { token } = await fastify.customOAuth2.getAccessTokenFromAuthorizationCodeFlow(req, reply);
			const userInfo = openIdUserInfoSchema.parse(await fastify.customOAuth2.userinfo(token));
			const requestOrigin = resolvePublicRequestOrigin(req);

			const newJwtToken = await reply.jwtSign({
				userId: userInfo.sub,
				username: userInfo.preferred_username ?? userInfo.sub,
			} satisfies AuthJWTPayload);

			reply.setCookie(
				AppConfig.authCookieName,
				newJwtToken,
				buildAuthCookieOptions(requestOrigin),
			);

			return reply.redirect(buildRootRedirectUrl(requestOrigin), 302);
		},
	});
};

export default oauthCallback;
