import type { CapacitorConfig } from '@capacitor/cli';

// Set CAP_LIVE_RELOAD to a full dev-server URL (see `pnpm cap:dev`) to point the
// native app at Vite for live reload. Unset → the app serves the static `build/` bundle.
const liveReloadUrl = process.env.CAP_LIVE_RELOAD;

const config: CapacitorConfig = {
	appId: 'care.mypool.app',
	appName: 'My Pool',
	webDir: 'build',
	...(liveReloadUrl ? { server: { url: liveReloadUrl } } : {}),
	plugins: {
		CapacitorSQLite: {
			iosDatabaseLocation: 'Library/CapacitorDatabase'
		},
		// Hold the native splash until the webview has booted, then hide() it from
		// the layout once app.ready flips — a seamless launch → webview handoff.
		// Background matches the brand gradient's darker end (#0B5A92).
		SplashScreen: {
			launchAutoHide: false,
			backgroundColor: '#0B5A92'
		}
	}
};

export default config;
