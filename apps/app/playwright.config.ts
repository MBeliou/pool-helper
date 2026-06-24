import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}',
	use: { baseURL: 'http://localhost:4173' },
	webServer: {
		// db:copy-wasm ensures the jeep-sqlite web store can fetch /assets/sql-wasm.wasm
		// on a clean checkout; build + preview serves the production static bundle.
		command: 'pnpm db:copy-wasm && pnpm build && pnpm preview',
		port: 4173,
		timeout: 180_000,
		reuseExistingServer: !process.env.CI
	}
});
