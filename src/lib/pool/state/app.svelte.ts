import { initializeDatabase, resetDatabaseInitialization } from '../db/connection';
import { loadProfile, saveProfile, type ProfileValues } from '../db/profileRepository';

import type { HardnessUnit, TemperatureUnit, VolumeUnit } from '../units';

const browser = typeof window !== 'undefined';

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message)), milliseconds);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			}
		);
	});
}

// legacy localStorage keys, imported once then removed
const LEGACY_PROFILE_KEY = 'ph.profile';
const LEGACY_ONBOARDED_KEY = 'ph.onboarded';

// Cross-screen app state: pool profile + flow selections, persisted to SQLite
class AppState {
	onboarded = $state(false);
	name = $state('My pool');
	// onboarding selections (defaults match the design)
	shape = $state('Oval');
	volume = $state('50,000');
	surface = $state('Plaster');
	sanitiser = $state('Chlorine');
	filter = $state('Sand');
	unitsPreset = $state('Metric (most of world)');
	volumeUnit = $state<VolumeUnit>('litres');
	hardnessUnit = $state<HardnessUnit>('°fH');
	temperatureUnit = $state<TemperatureUnit>('°C');
	// log flow
	tester = $state('AquaChek 7-in-1');
	reminderDays = $state(3);
	disclaimerAcceptedAt = $state<Date | null>(null);

	/** true once storage is initialized and the profile hydrated — the layout gates on it */
	ready = $state(false);
	loadError = $state<string | null>(null);

	// single-flight: the layout and individual pages can all await load()
	private loadPromise: Promise<void> | undefined;

	/** Never rejects — failures land in loadError so the layout can offer a retry. */
	load(): Promise<void> {
		if (!browser) return Promise.resolve();
		this.loadPromise ??= (async () => {
			try {
				// some failure modes (e.g. missing wasm asset on web) hang instead of
				// rejecting — a deadline turns them into a visible, retryable error
				await withTimeout(
					initializeDatabase(),
					15_000,
					'Storage initialization timed out after 15 s'
				);
				const storedProfile = await loadProfile();
				if (storedProfile) this.applyProfile(storedProfile);
				else await this.importLegacyLocalStorageProfile();
				this.ready = true;
				this.loadError = null;
			} catch (initializationError) {
				console.error('storage initialization failed', initializationError);
				this.loadError =
					initializationError instanceof Error
						? initializationError.message
						: String(initializationError);
				this.loadPromise = undefined; // allow retry
			}
		})();
		return this.loadPromise;
	}

	/** Full restart is the most reliable recovery from a half-initialized native bridge. */
	retryLoad(): void {
		resetDatabaseInitialization();
		window.location.reload();
	}

	async save(): Promise<void> {
		if (!browser) return;
		await saveProfile(this.toProfileValues());
	}

	async finishOnboarding(): Promise<void> {
		this.onboarded = true;
		await this.save();
	}

	private applyProfile(profile: ProfileValues): void {
		this.onboarded = profile.onboarded;
		this.name = profile.name;
		this.shape = profile.shape;
		if (profile.volume) this.volume = profile.volume;
		this.surface = profile.surface;
		this.sanitiser = profile.sanitiser;
		this.filter = profile.filter;
		this.unitsPreset = profile.unitsPreset;
		this.volumeUnit = profile.volumeUnit as VolumeUnit;
		this.hardnessUnit = profile.hardnessUnit as HardnessUnit;
		this.temperatureUnit = profile.temperatureUnit as TemperatureUnit;
		this.tester = profile.tester;
		this.reminderDays = profile.reminderDays;
		this.disclaimerAcceptedAt = profile.disclaimerAcceptedAt;
	}

	private toProfileValues(): ProfileValues {
		return {
			onboarded: this.onboarded,
			name: this.name,
			shape: this.shape,
			volume: this.volume,
			surface: this.surface,
			sanitiser: this.sanitiser,
			filter: this.filter,
			unitsPreset: this.unitsPreset,
			volumeUnit: this.volumeUnit,
			hardnessUnit: this.hardnessUnit,
			temperatureUnit: this.temperatureUnit,
			tester: this.tester,
			reminderDays: this.reminderDays,
			disclaimerAcceptedAt: this.disclaimerAcceptedAt
		};
	}

	async acceptDoseDisclaimer(): Promise<void> {
		this.disclaimerAcceptedAt = new Date();
		await this.save();
	}

	/** One-time migration from the pre-SQLite localStorage persistence. */
	private async importLegacyLocalStorageProfile(): Promise<void> {
		const legacyOnboarded = localStorage.getItem(LEGACY_ONBOARDED_KEY) === '1';
		const legacyProfileJson = localStorage.getItem(LEGACY_PROFILE_KEY);
		if (!legacyOnboarded && !legacyProfileJson) return; // fresh install — nothing to import
		if (legacyProfileJson) {
			try {
				const legacyProfile = JSON.parse(legacyProfileJson);
				this.shape = legacyProfile.shape ?? this.shape;
				this.volume = legacyProfile.volume ?? this.volume;
				this.surface = legacyProfile.surface ?? this.surface;
				this.sanitiser = legacyProfile.sanitiser ?? this.sanitiser;
				this.filter = legacyProfile.filter ?? this.filter;
				this.unitsPreset = legacyProfile.unitsPreset ?? this.unitsPreset;
				// 'gallons' predates the US/imperial split; old behaviour used the US factor
				this.volumeUnit =
					legacyProfile.volumeUnit === 'gallons'
						? 'US gal'
						: (legacyProfile.volumeUnit ?? this.volumeUnit);
				this.hardnessUnit = legacyProfile.hardnessUnit ?? this.hardnessUnit;
				this.temperatureUnit = legacyProfile.temperatureUnit ?? this.temperatureUnit;
				this.tester = legacyProfile.tester ?? this.tester;
			} catch {
				// corrupt legacy profile — keep defaults
			}
		}
		this.onboarded = legacyOnboarded;
		await this.save();
		localStorage.removeItem(LEGACY_PROFILE_KEY);
		localStorage.removeItem(LEGACY_ONBOARDED_KEY);
	}
}

export const app = new AppState();
