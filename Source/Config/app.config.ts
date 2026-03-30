import { AppEnvs } from './env';

export const AppConfig = {
	...AppEnvs,
	isDevelopment: AppEnvs.nodeEnv === 'development',
	cookieSecure: AppEnvs.cookieSecure ?? (AppEnvs.nodeEnv !== 'development'),
	logLevel: AppEnvs.logLevel || (AppEnvs.nodeEnv === 'development' ? 'debug' : 'info'),
} as const;
