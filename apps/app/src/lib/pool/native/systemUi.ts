// Native status bar + splash screen control. No-ops on web. Lazy-imports the
// plugins behind a platform guard so the web build never bundles them.
import { Capacitor } from '@capacitor/core';

const browser = typeof window !== 'undefined';
const isNative = () => browser && Capacitor.isNativePlatform();

let splashPromise: Promise<typeof import('@capacitor/splash-screen')> | undefined;
const loadSplash = () => (splashPromise ??= import('@capacitor/splash-screen'));
let statusBarPromise: Promise<typeof import('@capacitor/status-bar')> | undefined;
const loadStatusBar = () => (statusBarPromise ??= import('@capacitor/status-bar'));

/** Dismiss the native launch splash once the webview has content to show. */
export async function hideSplash(): Promise<void> {
	if (!isNative()) return;
	const { SplashScreen } = await loadSplash();
	await SplashScreen.hide();
}

/**
 * Every screen sits beneath the brand gradient header (NavHeader and the inline
 * wizard/onboarding headers all paint `--gradient`), so the status bar always
 * wants light (white) content. Overlay keeps the existing safe-area spacers.
 * Note: Capacitor's `Style.Dark` means *light content* — the enum is named for
 * the background colour, not the text.
 */
export async function applyStatusBar(): Promise<void> {
	if (!isNative()) return;
	const { StatusBar, Style } = await loadStatusBar();
	await StatusBar.setOverlaysWebView({ overlay: true });
	await StatusBar.setStyle({ style: Style.Dark });
}
