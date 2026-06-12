import { eq } from 'drizzle-orm';
import type { HardnessUnit, TemperatureUnit, VolumeUnit } from '../units';
import { database } from './connection';
import { profileTable, type ProfileRow } from './schema';

const PROFILE_ROW_ID = 1;

export interface ProfileValues {
	onboarded: boolean;
	name: string;
	shape: string;
	/** display string, e.g. "50,000" — stored as an integer */
	volume: string;
	surface: string;
	sanitiser: string;
	filter: string;
	unitsPreset: string;
	volumeUnit: VolumeUnit;
	hardnessUnit: HardnessUnit;
	temperatureUnit: TemperatureUnit;
	tester: string;
	reminderDays: number;
}

function volumeStringToInteger(volume: string): number | null {
	const digits = volume.replace(/[^0-9]/g, '');
	return digits ? Number(digits) : null;
}

function volumeIntegerToString(volume: number | null): string {
	return volume === null ? '' : volume.toLocaleString('en-US');
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
		volume: volumeIntegerToString(profileRow.volume),
		surface: profileRow.surface,
		sanitiser: profileRow.sanitiser,
		filter: profileRow.filter,
		unitsPreset: profileRow.unitsPreset,
		volumeUnit: profileRow.volumeUnit,
		hardnessUnit: profileRow.hardnessUnit,
		temperatureUnit: profileRow.temperatureUnit,
		tester: profileRow.tester,
		reminderDays: profileRow.reminderDays
	};
}

export async function saveProfile(profileValues: ProfileValues): Promise<void> {
	const rowValues = {
		id: PROFILE_ROW_ID,
		onboarded: profileValues.onboarded,
		name: profileValues.name,
		shape: profileValues.shape,
		volume: volumeStringToInteger(profileValues.volume),
		surface: profileValues.surface,
		sanitiser: profileValues.sanitiser,
		filter: profileValues.filter,
		unitsPreset: profileValues.unitsPreset,
		volumeUnit: profileValues.volumeUnit,
		hardnessUnit: profileValues.hardnessUnit,
		temperatureUnit: profileValues.temperatureUnit,
		tester: profileValues.tester,
		reminderDays: profileValues.reminderDays
	};
	// single-statement upsert — keeps the proxy executor on the 'run' path
	await database
		.insert(profileTable)
		.values(rowValues)
		.onConflictDoUpdate({ target: profileTable.id, set: rowValues });
}
