import fp from 'fastify-plugin';

export const SensiblePlugin = fp(async (server) => {
	await server.register(import('@fastify/sensible'));
});

export default SensiblePlugin;
