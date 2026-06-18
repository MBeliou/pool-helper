import { test, expect } from '@playwright/test';
import { completeOnboarding } from './helpers';

test('the wasm asset the web store depends on is served', async ({ request }) => {
	const response = await request.get('/assets/sql-wasm.wasm');
	expect(response.status()).toBe(200);
});

test('a brand-new user is sent to onboarding', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/onboarding\/welcome/);
	await expect(page.getByRole('button', { name: 'Set up my pool' })).toBeVisible();
});

test('completing onboarding lands home and survives a reload', async ({ page }) => {
	await completeOnboarding(page);
	// home content for a free user on web
	await expect(page.getByRole('button', { name: 'Get Pro' })).toBeVisible();

	await page.reload();
	// the onboarded flag persisted to SQLite, so no bounce back to onboarding
	await expect(page.getByRole('button', { name: 'Get Pro' })).toBeVisible();
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('button', { name: 'Set up my pool' })).toHaveCount(0);
});
