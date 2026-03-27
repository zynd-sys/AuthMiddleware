import fp from 'fastify-plugin';

export const CookiePlugin = fp(async (server) => {
	await server.register(import('@fastify/cookie'));
});

export default CookiePlugin;
