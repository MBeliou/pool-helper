import { test, expect } from '@playwright/test';
import { completeOnboarding } from './helpers';

test('logging a test (with a comma decimal) persists and shows in the journal', async ({ page }) => {
	await completeOnboarding(page);

	await page.goto('/log/entry');
	// pH entered with a French comma — must persist as 7.4, not 7 (the bug we fixed)
	await page.locator('#reading-0').fill('7,4');
	await page.locator('#reading-1').fill('3'); // free chlorine
	await page.getByRole('button', { name: /save/i }).click();
	await expect(page).toHaveURL(/\/results/);

	// the journal now has a test entry (no longer empty)
	await page.goto('/log');
	await expect(page.getByText('Nothing logged yet')).toHaveCount(0);
	const testEntry = page.locator('a[href^="/log/test"]').first();
	await expect(testEntry).toBeVisible();

	// the detail confirms the comma was parsed to 7.4
	await testEntry.click();
	await expect(page).toHaveURL(/\/log\/test/);
	await expect(page.getByText('7.4').first()).toBeVisible();
});

test('an out-of-range reading produces a fix-plan action (dosing pipeline)', async ({ page }) => {
	await completeOnboarding(page);

	await page.goto('/log/entry');
	await page.locator('#reading-1').fill('0.2'); // very low free chlorine
	await page.getByRole('button', { name: /save/i }).click();

	await expect(page).toHaveURL(/\/results/);
	// dose depends on the (default 50,000 L) volume being usable end-to-end
	await expect(page.getByText('Raise free chlorine')).toBeVisible();
});
