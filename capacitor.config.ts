import type { CapacitorConfig } from '@capacitor/cli';

// Set CAP_LIVE_RELOAD to a full dev-server URL (see `pnpm cap:dev`) to point the
// native app at Vite for live reload. Unset → the app serves the static `build/` bundle.
const liveReloadUrl = process.env.CAP_LIVE_RELOAD;

const config: CapacitorConfig = {
	appId: 'com.example.app',
	appName: 'pool-helper',
	webDir: 'build',
	...(liveReloadUrl ? { server: { url: liveReloadUrl } } : {}),
	plugins: {
		CapacitorSQLite: {
			iosDatabaseLocation: 'Library/CapacitorDatabase'
		}
	}
};

export default config;
