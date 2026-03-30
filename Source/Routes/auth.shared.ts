import type { FastifyRequest } from 'fastify';

import { z } from 'zod';

import { AppConfig } from '../Config/app.config';
import { oneMonth } from '../Consts/days';

export const authJwtPayloadSchema = z.object({
	userId: z.string().min(1),
	username: z.string().min(1).optional(),
});

export const openIdUserInfoSchema = z.object({
	sub: z.string().min(1),
	preferred_username: z.string().min(1).optional(),
}).passthrough();

export type AuthJWTPayload = z.infer<typeof authJwtPayloadSchema>;

interface PublicRequestOrigin {
	host: string;
	proto: string;
}

export interface PublicRequestLocation extends PublicRequestOrigin {
	uri: string;
}

interface ForwardedRequestHeaderPresence {
	hasForwardedMethod: boolean;
	hasForwardedProto: boolean;
	hasForwardedHost: boolean;
	hasForwardedUri: boolean;
	hasForwardedFor: boolean;
}

interface AuthorizationRedirectDebugInfo {
	hasState: boolean;
	hasCodeChallenge: boolean;
}

const returnToCookieMaxAgeMs = 10 * 60 * 1000;

const readForwardedHeader = (value: string | string[] | undefined) => {
	if (Array.isArray(value)) return value[0];
	return value?.split(',')[0]?.trim();
};

export const hasCookie = (req: FastifyRequest, cookieName: string) => Boolean(req.cookies[cookieName]);

const buildSharedCookieOptions = () => ({
	path: '/',
	httpOnly: true as const,
	sameSite: 'lax' as const,
	secure: AppConfig.cookieSecure,
	...(AppConfig.cookieDomain ? { domain: AppConfig.cookieDomain } : {}),
});

export const buildForwardedRequestHeaderPresence = (req: FastifyRequest): ForwardedRequestHeaderPresence => ({
	hasForwardedMethod: Boolean(readForwardedHeader(req.headers['x-forwarded-method'])),
	hasForwardedProto: Boolean(readForwardedHeader(req.headers['x-forwarded-proto'])),
	hasForwardedHost: Boolean(readForwardedHeader(req.headers['x-forwarded-host'])),
	hasForwardedUri: Boolean(readForwardedHeader(req.headers['x-forwarded-uri'])),
	hasForwardedFor: Boolean(readForwardedHeader(req.headers['x-forwarded-for'])),
});

export const resolvePublicRequestOrigin = (req: FastifyRequest): PublicRequestOrigin => ({
	proto: readForwardedHeader(req.headers['x-forwarded-proto']) ?? 'http',
	host: readForwardedHeader(req.headers['x-forwarded-host']) ?? req.host,
});

export const resolvePublicRequestLocation = (req: FastifyRequest): PublicRequestLocation => ({
	...resolvePublicRequestOrigin(req),
	uri: readForwardedHeader(req.headers['x-forwarded-uri']) ?? req.url,
});

export const buildAuthorizationRedirectDebugInfo = (redirectUri: string): AuthorizationRedirectDebugInfo => {
	const parsedRedirectUri = new URL(redirectUri);

	return {
		hasState: parsedRedirectUri.searchParams.has('state'),
		hasCodeChallenge: parsedRedirectUri.searchParams.has('code_challenge'),
	};
};

export const buildRootRedirectUrl = ({ proto, host }: PublicRequestOrigin) => `${proto}://${host}/`;

export const buildForwardedRequestUrl = ({ proto, host, uri }: PublicRequestLocation) => `${proto}://${host}${uri}`;

export const resolveReturnToCookieName = () => `${AppConfig.sessionCookieName}-return-to`;

const normalizeCookieDomain = (domain: string) => domain.replace(/^\.+/, '').toLowerCase();

export const resolveRedirectTarget = (req: FastifyRequest, fallbackUrl: string) => {
	const returnToCookie = req.cookies[resolveReturnToCookieName()];
	if (!returnToCookie) return fallbackUrl;

	try {
		const returnToUrl = new URL(returnToCookie);
		const fallbackOrigin = new URL(fallbackUrl);
		const cookieDomain = AppConfig.cookieDomain ? normalizeCookieDomain(AppConfig.cookieDomain) : null;
		const normalizedHostname = returnToUrl.hostname.toLowerCase();
		const isSameOrigin = returnToUrl.origin === fallbackOrigin.origin;
		const isWithinCookieDomain = cookieDomain
			? normalizedHostname === cookieDomain || normalizedHostname.endsWith(`.${cookieDomain}`)
			: false;
		const isHttpProtocol = ['http:', 'https:'].includes(returnToUrl.protocol);

		if (isHttpProtocol && (isSameOrigin || isWithinCookieDomain)) return returnToUrl.toString();
	} catch { }

	return fallbackUrl;
};

export const buildAuthCookieOptions = (_origin: PublicRequestOrigin) => ({
	...buildSharedCookieOptions(),
	expires: new Date(Date.now() + (3 * oneMonth)),
});

export const buildReturnToCookieOptions = () => ({
	...buildSharedCookieOptions(),
	maxAge: returnToCookieMaxAgeMs,
});
