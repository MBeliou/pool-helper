// Export the user's data: native → write a JSON file and open the share sheet;
// web → download a Blob. Native plugins are lazy-imported behind a platform
// guard so the web build never pulls them in.
import { Capacitor } from '@capacitor/core';
import { exportAllData } from './db/exportData';

const browser = typeof window !== 'undefined';
const isNative = () => browser && Capacitor.isNativePlatform();

function exportFilename(): string {
	const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	return `my-pool-export-${date}.json`;
}

export async function shareExport(): Promise<void> {
	const json = JSON.stringify(await exportAllData(), null, 2);
	const filename = exportFilename();

	if (isNative()) {
		const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
		const { Share } = await import('@capacitor/share');
		const written = await Filesystem.writeFile({
			path: filename,
			data: json,
			directory: Directory.Cache,
			encoding: Encoding.UTF8
		});
		await Share.share({ title: 'My Pool data export', url: written.uri });
		return;
	}

	// web fallback: trigger a download
	if (!browser) return;
	const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
