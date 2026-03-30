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

const readForwardedHeader = (value: string | string[] | undefined) => {
	if (Array.isArray(value)) return value[0];
	return value?.split(',')[0]?.trim();
};

export const resolvePublicRequestOrigin = (req: FastifyRequest): PublicRequestOrigin => ({
	proto: readForwardedHeader(req.headers['x-forwarded-proto']) ?? 'http',
	host: readForwardedHeader(req.headers['x-forwarded-host']) ?? req.host,
});

export const buildRootRedirectUrl = ({ proto, host }: PublicRequestOrigin) => `${proto}://${host}/`;

export const buildAuthCookieOptions = (_origin: PublicRequestOrigin) => ({
	path: '/',
	httpOnly: true as const,
	sameSite: 'lax' as const,
	secure: AppConfig.cookieSecure,
	expires: new Date(Date.now() + (3 * oneMonth)),
});
