import fp from 'fastify-plugin';

export const TypeProviderPlugin = fp(async (server) => {
	const {
		serializerCompiler,
		validatorCompiler,
	} = await import('fastify-type-provider-zod');

	server.withTypeProvider<import('fastify-type-provider-zod').ZodTypeProvider>();
	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);
});

export default TypeProviderPlugin;
