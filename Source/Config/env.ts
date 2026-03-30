import { z } from 'zod';

import { readConfig } from './readConfig';

const normalizeRedirectUri = (value: string) => value.startsWith('/') ? value : `/${value}`;
const normalizeBooleanEnv = (value: unknown) => {
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return value;

	const normalizedValue = value.trim().toLowerCase();
	if (['true', '1', 'yes', 'on'].includes(normalizedValue)) return true;
	if (['false', '0', 'no', 'off'].includes(normalizedValue)) return false;

	return value;
};

const scheme = z.object({
	port: z.coerce.number().positive().max(65_535).default(3_000),
	nodeEnv: z.enum(['production', 'development']).default('production'),
	logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
	listenType: z.enum(['local', 'all']).default('local'),

	serverName: z.string().default('auth-middleware'),
	version: z.string().default('unknown'),

	secret: z.string().regex(/^[\da-f]{64}$/i, 'SECRET must be a 64-character hex string'),

	openidSecret: z.string().trim().min(1).optional(),
	openidSecretFile: z.string().trim().min(1).optional(),
	openidClientId: z.string().trim().min(1),
	openidWellKnown: z.url().transform((url) => new URL(url)),
	openidExternalOrigin: z.url().optional(),

	authCookieName: z.string().default('auth'),
	sessionCookieName: z.string().default('auth-session'),
	cookieSecure: z.preprocess(normalizeBooleanEnv, z.boolean().optional()),
	redirectUri: z.string().default('/oauth/callback').transform(normalizeRedirectUri),
}).superRefine((envs, { addIssue }) => {
	if (!envs.openidSecret && !envs.openidSecretFile) {
		addIssue({
			code: 'custom',
			path: ['openidSecret'],
			message: 'not set envs: openidSecret, openidSecretFile',
		});
	}
});

export const AppEnvs = await readConfig(scheme, {
	loadDotenv: true,
});
