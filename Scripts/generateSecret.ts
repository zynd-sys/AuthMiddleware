import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';

const ENV_NAME = 'SECRET';
const FILE_PATH = '.env';

const secretHex = randomBytes(32).toString('hex');

let envContent;
try {
	envContent = await fs.readFile(FILE_PATH, 'utf-8');
} catch (error) {
	console.warn(error);
	envContent = '';
}

const groups = envContent.match(/SECRET=(.+)/);
if (groups) {
	console.warn(`${ENV_NAME} already created`);
	process.exit(0);
}

envContent += `\n${ENV_NAME}='${secretHex}'`;
await fs.writeFile(FILE_PATH, envContent);
