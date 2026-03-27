import fs from 'node:fs/promises';
import process from 'node:process';

import { z } from 'zod';

type LoadEnvFile = typeof process.loadEnvFile;

interface ReadConfigOptions {
	loadDotenv?: boolean | Parameters<LoadEnvFile>[0];
}

const envFileLoader = 'loadEnvFile' in process ? process.loadEnvFile.bind(process) : undefined;

const normalizeEnvKey = (key: string) => key.toLowerCase().replace(/_(.)/g, (_match, char: string) => char.toUpperCase());

const readConfigFile = async () => {
	const configPath = process.env['CONFIG_PATH'];
	if (!configPath) return;

	try {
		const fileData = await fs.readFile(configPath, { encoding: 'utf8' });
		return z.record(z.string(), z.unknown()).parse(JSON.parse(fileData));
	} catch (error) {
		console.error('Failed to read config file', error);
		return;
	}
};

const loadDotenv = (loadEnv: ReadConfigOptions['loadDotenv']) => {
	if (!envFileLoader || !loadEnv) return;

	try {
		envFileLoader('.env.local');
		if (loadEnv === true) {
			envFileLoader();
			return;
		}

		envFileLoader(loadEnv);
	} catch (error) {
		console.warn('Failed to load env file', error);
	}
};

export async function readConfig<T extends z.ZodTypeAny>(
	scheme: T,
	options?: ReadConfigOptions,
): Promise<z.infer<T>> {
	loadDotenv(options?.loadDotenv);

	const envConfig: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(process.env)) {
		envConfig[normalizeEnvKey(key)] = value;
	}

	const config = Object.assign(envConfig, (await readConfigFile()) || {});
	const parseResult = scheme.safeParse(config);
	if (parseResult.error) throw new Error(z.prettifyError(parseResult.error));

	return parseResult.data;
}
