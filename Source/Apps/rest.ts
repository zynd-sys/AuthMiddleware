import process from 'node:process';

import { AppConfig } from '../Config/app.config';
import { logger } from '../Lib/logger';
import { buildServer } from './rest.core';

const resolveListenHost = () => AppConfig.listenType === 'all' ? '0.0.0.0' : '127.0.0.1';

const server = await buildServer();

try {
	const address = await server.listen({
		port: AppConfig.port,
		host: resolveListenHost(),
	});

	logger.info({
		address,
		port: AppConfig.port,
		nodeEnv: AppConfig.nodeEnv,
		pid: process.pid,
	}, 'REST server is up and running');
} catch (error) {
	logger.error({ error }, 'Failed to start REST server');
	process.exit(1);
}
