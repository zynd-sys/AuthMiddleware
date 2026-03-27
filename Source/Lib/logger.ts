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
	timestamp: pino.stdTimeFunctions.isoTime,
}, transport);
