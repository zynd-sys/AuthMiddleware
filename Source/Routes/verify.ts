import type { FastifyRequest } from 'fastify';

import { z } from 'zod';

import { AppConfig } from '../Config/app.config';
import type { FastifyPluginAsyncWithTypeProvider } from '../Types/FastifyPluginAsyncWithTypeProvider';
import {
	authJwtPayloadSchema,
	buildAuthorizationRedirectDebugInfo,
	buildForwardedRequestHeaderPresence,
	buildForwardedRequestUrl,
	buildReturnToCookieOptions,
	hasCookie,
	resolvePublicRequestLocation,
	resolveReturnToCookieName,
	type AuthJWTPayload,
} from './auth.shared';

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
	} catch (error) {
		if (hasCookie(req, AppConfig.authCookieName)) {
			req.log.debug({
				hasAuthCookie: true,
				errorName: error instanceof Error ? error.name : 'UnknownError',
				errorMessage: error instanceof Error ? error.message : 'Unknown auth cookie verification failure',
			}, 'Auth cookie exists but JWT verification failed');
		}

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
				req.log.debug({
					hasAuthCookie: hasCookie(req, AppConfig.authCookieName),
					hasUsernameClaim: Boolean(jwtToken.username),
					forwardedHeaders: buildForwardedRequestHeaderPresence(req),
				}, 'ForwardAuth accepted request using existing auth cookie');

				reply.header('x-user', jwtToken.userId);
				reply.header('x-user-username', jwtToken.username ?? jwtToken.userId);
				return reply.code(204).send();
			}

			verifyHeadersSchema.parse(req.headers);
			const publicRequestLocation = resolvePublicRequestLocation(req);

			reply.setCookie(
				resolveReturnToCookieName(),
				buildForwardedRequestUrl(publicRequestLocation),
				buildReturnToCookieOptions(),
			);

			req.log.debug({
				hasAuthCookie: hasCookie(req, AppConfig.authCookieName),
				hasOAuthStateCookie: hasCookie(req, AppConfig.sessionCookieName),
				setsReturnToCookie: true,
				returnToHost: publicRequestLocation.host,
				cookieSecure: AppConfig.cookieSecure,
				cookieDomain: AppConfig.cookieDomain,
				forwardedHeaders: buildForwardedRequestHeaderPresence(req),
			}, 'ForwardAuth requires OpenID redirect');

			let redirectURI = await fastify.customOAuth2.generateAuthorizationUri(
				req,
				reply,
			);

			if (AppConfig.openidExternalOrigin) {
				const parsedRedirectURI = new URL(redirectURI);
				redirectURI = redirectURI.replace(parsedRedirectURI.origin, AppConfig.openidExternalOrigin);
			}

			req.log.debug({
				usesOpenidExternalOrigin: Boolean(AppConfig.openidExternalOrigin),
				redirect: buildAuthorizationRedirectDebugInfo(redirectURI),
			}, 'Generated OpenID authorization redirect');

			return reply.redirect(redirectURI, 302);
		},
	});
};

export default verify;
