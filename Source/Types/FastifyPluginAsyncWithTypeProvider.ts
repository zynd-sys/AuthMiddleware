import type {
	FastifyBaseLogger,
	FastifyPluginAsync,
	FastifyPluginOptions,
	RawServerBase,
	RawServerDefault,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

export type FastifyPluginAsyncWithTypeProvider<
	Options extends FastifyPluginOptions = Record<never, never>,
	Server extends RawServerBase = RawServerDefault,
	Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyPluginAsync<Options, Server, ZodTypeProvider, Logger>;
