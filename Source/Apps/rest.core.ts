import Fastify, { type FastifyInstance } from 'fastify';

import { logger } from '../Lib/logger';
import { registryRoutes } from '../Routes/.registry';

export const buildServer = async () => {
	const fastify = Fastify({
		loggerInstance: logger,
	});

	await fastify.register(import('../Plugins/sensible'));
	await fastify.register(import('../Plugins/cookie'));
	await fastify.register(import('../Plugins/jwt'));
	await fastify.register(import('../Plugins/serverName'));
	await fastify.register(import('../Plugins/secureSession'));
	await fastify.register(import('../Plugins/typeProvider'));
	await fastify.register(import('../Plugins/oauth2'));

	await registryRoutes(fastify as unknown as FastifyInstance);

	return fastify;
};
