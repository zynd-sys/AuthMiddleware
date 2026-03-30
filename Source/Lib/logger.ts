import pino from 'pino';

import { AppConfig } from '../Config/app.config';

const transport = AppConfig.isDevelopment ? pino.transport({
	targets: [{
		target: 'pino-pretty',
		options: {
			colorize: true,
			ignore: 'pid,hostname',
			translateTime: 'SYS:standard',
		},
	}],
}) : undefined;

export const logger = pino({
	level: AppConfig.logLevel,
	base: {
		env: AppConfig.nodeEnv,
		version: AppConfig.version,
	},
	redact: {
		paths: [
			'req.headers.authorization',
			'req.headers.cookie',
			'req.headers.set-cookie',
			'req.headers.x-forwarded-for',
			'req.query.code',
			'req.query.state',
			'headers.authorization',
			'headers.cookie',
			'headers.set-cookie',
			'headers.x-forwarded-for',
			'authorization',
			'cookie',
			'set-cookie',
			'access_token',
			'refresh_token',
			'id_token',
			'token',
			'*.access_token',
			'*.refresh_token',
			'*.id_token',
			'*.token',
		],
		censor: '[redacted]',
	},
	timestamp: pino.stdTimeFunctions.isoTime,
}, transport);
