/**
 * vitest.config.js
 */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    test: {
        env: loadEnvTest(),
        testTimeout: 60000,
        pool: 'forks',
        poolOptions: { forks: { singleFork: true } },
        globalSetup: ['./tests/global-setup.js'],
        setupFiles: ['./tests/integration/setup-int.js'],
        include: ['tests/integration/**/*.test.js', 'tests/unit/**/*.test.js'],
        // Force fresh modules for each test if needed
        // deps: { inline: [/@google\/genai/] }
        reporter: 'verbose',
    },
});

function loadEnvTest() {
    const envFile = path.join(__dirname, '.env.test');
    if (!fs.existsSync(envFile)) return {};
    const content = fs.readFileSync(envFile, 'utf8');
    const env = {
        VITEST: 'true',
        NODE_ENV: 'test'
    };
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key) env[key.trim()] = valueParts.join('=').trim();
        }
    });
    return env;
}
