import { z } from 'zod';

import { AppConfig } from '../Config/app.config';
import type { FastifyPluginAsyncWithTypeProvider } from '../Types/FastifyPluginAsyncWithTypeProvider';
import {
	buildAuthCookieOptions,
	buildForwardedRequestHeaderPresence,
	buildRootRedirectUrl,
	buildReturnToCookieOptions,
	hasCookie,
	openIdUserInfoSchema,
	resolveRedirectTarget,
	resolvePublicRequestOrigin,
	resolveReturnToCookieName,
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

			req.log.debug({
				hasCode: Boolean(query.code),
				hasState: Boolean(query.state),
				hasProviderError: Boolean(query.error),
				hasErrorDescription: Boolean(query.error_description),
				hasAuthCookie: hasCookie(req, AppConfig.authCookieName),
				hasOAuthStateCookie: hasCookie(req, AppConfig.sessionCookieName),
				forwardedHeaders: buildForwardedRequestHeaderPresence(req),
			}, 'Received OpenID callback request');

			if (query.error) {
				req.log.warn({
					hasErrorDescription: Boolean(query.error_description),
				}, 'OpenID provider returned an error to the callback endpoint');

				throw fastify.httpErrors.unauthorized(query.error_description ?? query.error);
			}

			if (!query.code || !query.state) {
				req.log.warn({
					hasCode: Boolean(query.code),
					hasState: Boolean(query.state),
				}, 'OpenID callback is missing required authorization parameters');

				throw fastify.httpErrors.badRequest('Missing authorization code or state');
			}

			const { token } = await fastify.customOAuth2.getAccessTokenFromAuthorizationCodeFlow(req, reply);
			let rawUserInfo: unknown;

			try {
				rawUserInfo = await fastify.customOAuth2.userinfo(token);
			} catch (error) {
				req.log.error({
					errorName: error instanceof Error ? error.name : 'UnknownError',
					errorMessage: error instanceof Error ? error.message : 'Unknown userinfo failure',
				}, 'Failed to fetch OpenID user info');

				throw fastify.httpErrors.badGateway('OpenID userinfo request failed');
			}

			const userInfo = openIdUserInfoSchema.parse(rawUserInfo);
			const requestOrigin = resolvePublicRequestOrigin(req);
			const username = userInfo.preferred_username ?? userInfo.sub;
			const fallbackRedirectUrl = buildRootRedirectUrl(requestOrigin);
			const redirectTarget = resolveRedirectTarget(req, fallbackRedirectUrl);

			const newJwtToken = await reply.jwtSign({
				userId: userInfo.sub,
				username,
			} satisfies AuthJWTPayload);

			reply.setCookie(
				AppConfig.authCookieName,
				newJwtToken,
				buildAuthCookieOptions(requestOrigin),
			);
			reply.clearCookie(resolveReturnToCookieName(), buildReturnToCookieOptions());

			req.log.debug({
				cookieSecure: AppConfig.cookieSecure,
				cookieDomain: AppConfig.cookieDomain,
				hasPreferredUsername: Boolean(userInfo.preferred_username),
				redirectTarget,
			}, 'OpenID callback completed and issued a new auth cookie');

			return reply.redirect(redirectTarget, 302);
		},
	});
};

export default oauthCallback;
