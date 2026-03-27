import type { FastifyPluginAsync } from 'fastify';

import { z } from 'zod';

import { AppConfig } from '../Config/app.config';

const health: FastifyPluginAsync = async (fastify) => {
	fastify.route({
		url: '/health',
		method: 'GET',
		schema: {
			description: 'app health check',
			response: {
				200: z.object({
					status: z.literal('ok'),
					service: z.string(),
					version: z.string(),
				}),
			},
		},
		handler: async (_, reply) => reply.code(200).send({
			status: 'ok',
			service: AppConfig.serverName,
			version: AppConfig.version,
		}),
	});
};

export default health;
