// Local-notification test reminders. Native-only (iOS); a no-op on web so the
// browser preview never errors. Follows the lazy-import + native-guard pattern
// used by the billing singleton.
import { Capacitor } from '@capacitor/core';

const browser = typeof window !== 'undefined';
const isNative = () => browser && Capacitor.isNativePlatform();

/** UI can hide the toggle where notifications can't run (web/simulator-web). */
export const remindersSupported = isNative();

// A single test reminder lives under a fixed id, so rescheduling is just
// cancel-then-schedule. Bump only if the notification's meaning changes.
const REMINDER_ID = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

let pluginPromise: Promise<typeof import('@capacitor/local-notifications')> | undefined;
const loadPlugin = () => (pluginPromise ??= import('@capacitor/local-notifications'));

/** Whether the OS currently allows us to post notifications. False on web. */
export async function remindersPermissionGranted(): Promise<boolean> {
	if (!isNative()) return false;
	const { LocalNotifications } = await loadPlugin();
	const status = await LocalNotifications.checkPermissions();
	return status.display === 'granted';
}

/** Prompt for permission; resolves to whether it ended up granted. Native-only. */
export async function requestRemindersPermission(): Promise<boolean> {
	if (!isNative()) return false;
	const { LocalNotifications } = await loadPlugin();
	const status = await LocalNotifications.requestPermissions();
	return status.display === 'granted';
}

/**
 * Cancel the existing test reminder and schedule the next one at
 * `fromDate + reminderDays`. No-op on web or without permission. Call after
 * every test insert and whenever the cadence changes so the nudge always
 * tracks the latest reading.
 */
export async function rescheduleTestReminder(reminderDays: number, fromDate: Date): Promise<void> {
	if (!isNative()) return;
	const { LocalNotifications } = await loadPlugin();
	const status = await LocalNotifications.checkPermissions();
	if (status.display !== 'granted') return;

	await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });

	const at = new Date(fromDate.getTime() + reminderDays * DAY_MS);
	await LocalNotifications.schedule({
		notifications: [
			{
				id: REMINDER_ID,
				title: 'Time to test your pool',
				body: "It's been a while since your last reading — a quick test keeps your water balanced.",
				schedule: { at }
			}
		]
	});
}

/** Remove any scheduled test reminder (e.g. the user turns reminders off). */
export async function cancelTestReminder(): Promise<void> {
	if (!isNative()) return;
	const { LocalNotifications } = await loadPlugin();
	await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
}

// Separate id from the real reminder so firing a test never clobbers it.
const TEST_REMINDER_ID = 999;

/**
 * Dev/QA helper: schedule a one-off notification ~5s out so delivery can be
 * verified without waiting for the real cadence. Returns false if not granted
 * (caller can prompt) or on web. Note: iOS usually hides the banner while the
 * app is foregrounded — background or lock the device to see it arrive.
 */
export async function sendTestNotificationNow(): Promise<boolean> {
	if (!isNative()) return false;
	const { LocalNotifications } = await loadPlugin();
	let status = await LocalNotifications.checkPermissions();
	if (status.display !== 'granted') status = await LocalNotifications.requestPermissions();
	if (status.display !== 'granted') return false;
	await LocalNotifications.schedule({
		notifications: [
			{
				id: TEST_REMINDER_ID,
				title: 'Test notification',
				body: 'If you can see this, reminders are working. 🏊',
				schedule: { at: new Date(Date.now() + 5000) }
			}
		]
	});
	return true;
}
