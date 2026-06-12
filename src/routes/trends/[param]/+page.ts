import type { EntryGenerator } from './$types';
import { PARAMETERS } from '$lib/pool/chemistry';

export const entries: EntryGenerator = () =>
	PARAMETERS.filter((parameter) => parameter.key !== 'temp').map((parameter) => ({
		param: parameter.key
	}));
