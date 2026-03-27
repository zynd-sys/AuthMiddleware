import fp from 'fastify-plugin';

import { AppConfig } from '../Config/app.config';

export interface ServerNamePluginOptions {
	name?: string
}

export const ServerNamePlugin = fp<ServerNamePluginOptions>(async (server, { name }) => {
	server.addHook('onSend', async (_, reply) => {
		reply.header('server', name || AppConfig.serverName);
	});
});

export default ServerNamePlugin;
