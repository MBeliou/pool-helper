import { initializeDatabase } from '../db/connection';
import { loadProfile, saveProfile, type ProfileValues } from '../db/profileRepository';

import type { HardnessUnit, TemperatureUnit, VolumeUnit } from '../units';

const browser = typeof window !== 'undefined';

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

	// single-flight: the layout and individual pages can all await load()
	private loadPromise: Promise<void> | undefined;

	load(): Promise<void> {
		if (!browser) return Promise.resolve();
		this.loadPromise ??= (async () => {
			await initializeDatabase();
			const storedProfile = await loadProfile();
			if (storedProfile) {
				this.applyProfile(storedProfile);
				return;
			}
			await this.importLegacyLocalStorageProfile();
		})();
		return this.loadPromise;
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
			reminderDays: this.reminderDays
		};
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
				this.volumeUnit = legacyProfile.volumeUnit ?? this.volumeUnit;
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
