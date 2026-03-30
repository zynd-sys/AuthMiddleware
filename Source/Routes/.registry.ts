import type { FastifyInstance } from 'fastify';

export const registryRoutes = async (server: FastifyInstance) => {
	await server.register(import('./health'));
	await server.register(import('./oauthCallback'));
	await server.register(import('./verify'));
}
