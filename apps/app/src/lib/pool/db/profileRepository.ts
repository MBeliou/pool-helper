import { eq } from 'drizzle-orm';
import type { HardnessUnit, TemperatureUnit, VolumeUnit } from '../units';
import { database } from './connection';
import { profileTable, type ProfileRow } from './schema';

const PROFILE_ROW_ID = 1;

export interface ProfileValues {
	onboarded: boolean;
	name: string;
	shape: string;
	/** pool volume in volumeUnit, as a real number (null = not set) */
	volume: number | null;
	surface: string;
	sanitiser: string;
	location: string;
	sunExposure: string;
	filter: string;
	unitsPreset: string;
	volumeUnit: VolumeUnit;
	hardnessUnit: HardnessUnit;
	temperatureUnit: TemperatureUnit;
	tester: string;
	reminderDays: number;
	disclaimerAcceptedAt: Date | null;
}

export async function loadProfile(): Promise<ProfileValues | undefined> {
	const rows = await database
		.select()
		.from(profileTable)
		.where(eq(profileTable.id, PROFILE_ROW_ID))
		.limit(1);
	const profileRow: ProfileRow | undefined = rows[0];
	if (!profileRow) return undefined;
	return {
		onboarded: profileRow.onboarded,
		name: profileRow.name,
		shape: profileRow.shape,
		volume: profileRow.volume,
		surface: profileRow.surface,
		sanitiser: profileRow.sanitiser,
		location: profileRow.location,
		sunExposure: profileRow.sunExposure,
		filter: profileRow.filter,
		unitsPreset: profileRow.unitsPreset,
		volumeUnit: profileRow.volumeUnit,
		hardnessUnit: profileRow.hardnessUnit,
		temperatureUnit: profileRow.temperatureUnit,
		tester: profileRow.tester,
		reminderDays: profileRow.reminderDays,
		disclaimerAcceptedAt: profileRow.disclaimerAcceptedAt
	};
}

export async function saveProfile(profileValues: ProfileValues): Promise<void> {
	const rowValues = {
		id: PROFILE_ROW_ID,
		onboarded: profileValues.onboarded,
		name: profileValues.name,
		shape: profileValues.shape,
		volume: profileValues.volume,
		surface: profileValues.surface,
		sanitiser: profileValues.sanitiser,
		location: profileValues.location,
		sunExposure: profileValues.sunExposure,
		filter: profileValues.filter,
		unitsPreset: profileValues.unitsPreset,
		volumeUnit: profileValues.volumeUnit,
		hardnessUnit: profileValues.hardnessUnit,
		temperatureUnit: profileValues.temperatureUnit,
		tester: profileValues.tester,
		reminderDays: profileValues.reminderDays,
		disclaimerAcceptedAt: profileValues.disclaimerAcceptedAt
	};
	// single-statement upsert — keeps the proxy executor on the 'run' path
	await database
		.insert(profileTable)
		.values(rowValues)
		.onConflictDoUpdate({ target: profileTable.id, set: rowValues });
}
