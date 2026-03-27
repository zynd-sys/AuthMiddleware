import type { FastifyReply, FastifyRequest } from 'fastify';

import { z } from 'zod';

import { AppConfig } from '../Config/app.config';
import { oneMonth } from '../Consts/days';
import type { FastifyPluginAsyncWithTypeProvider } from '../Types/FastifyPluginAsyncWithTypeProvider';

declare module '@fastify/secure-session' {
	interface SessionData {
		auth: {
			accessToken: string
			refreshToken: string
		}
	}
}

const verifyHeadersSchema = z.object({
	'x-forwarded-method': z.string(),
	'x-forwarded-proto': z.string(),
	'x-forwarded-host': z.string(),
	'x-forwarded-uri': z.string(),
	'x-forwarded-for': z.string(),
});

const authJwtPayloadSchema = z.object({
	userId: z.string().min(1),
});

const openIdUserInfoSchema = z.object({
	sub: z.string().min(1),
}).passthrough();

type AuthJWTPayload = z.infer<typeof authJwtPayloadSchema>;
type VerifyHeaders = z.infer<typeof verifyHeadersSchema>;

const buildRootRedirectUrl = (headers: VerifyHeaders) => `${headers['x-forwarded-proto']}://${headers['x-forwarded-host']}/`;

const buildAuthCookieOptions = (headers: VerifyHeaders) => ({
	path: '/',
	httpOnly: true as const,
	sameSite: 'lax' as const,
	secure: headers['x-forwarded-proto'] === 'https' || !AppConfig.isDevelopment,
	expires: new Date(Date.now() + (3 * oneMonth)),
});

const readJwtPayload = async (req: FastifyRequest): Promise<AuthJWTPayload | null> => {
	try {
		const payload = await req.jwtVerify<AuthJWTPayload>();
		return authJwtPayloadSchema.parse(payload);
	} catch {
		return null;
	}
};

const finishAuthorization = async (
	req: FastifyRequest,
	reply: FastifyReply,
	fastify: FastifyRequest['server'],
	headers: VerifyHeaders,
) => {
	const { token } = await fastify.customOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
	const userInfo = openIdUserInfoSchema.parse(await fastify.customOAuth2.userinfo(token));

	const newJwtToken = await reply.jwtSign({
		userId: userInfo.sub,
	} satisfies AuthJWTPayload);

	reply.setCookie(
		AppConfig.authCookieName,
		newJwtToken,
		buildAuthCookieOptions(headers),
	);

	return reply.redirect(buildRootRedirectUrl(headers), 302);
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
				return reply.code(204).send();
			}

			const headers = verifyHeadersSchema.parse(req.headers);
			const uri = headers['x-forwarded-uri'];

			if (uri.startsWith(AppConfig.redirectUri)) {
				return finishAuthorization(req, reply, fastify, headers);
			}

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
