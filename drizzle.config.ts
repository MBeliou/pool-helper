import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/pool/db/schema.ts',
	out: './src/lib/pool/db/migrations'
});
