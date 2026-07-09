import { test, expect } from '@playwright/test';
import { completeOnboarding } from './helpers';

test('a fresh pool shows tester setup, then empty log and care states', async ({ page }) => {
	await completeOnboarding(page);

	// first /log visit: tester setup replaces the journal until confirmed
	await page.goto('/log');
	await expect(page.getByText('Pick the kits you own', { exact: false })).toBeVisible();
	await page.getByRole('button', { name: /Taylor K-2006/ }).click();
	await page.getByRole('button', { name: 'Save my testers →' }).click();

	await expect(page.getByText('Nothing logged yet')).toBeVisible();

	// setup never returns
	await page.reload();
	await expect(page.getByText('Nothing logged yet')).toBeVisible();

	await page.goto('/care');
	await expect(page.getByText('No issues on record')).toBeVisible();
});

test('the More screen exposes data export and links into settings', async ({ page }) => {
	await completeOnboarding(page);
	await page.goto('/more');

	await expect(page.getByText('Export my data')).toBeVisible();

	await page.getByRole('link', { name: 'Pool profile' }).click();
	await expect(page).toHaveURL(/\/more\/profile/);
});
