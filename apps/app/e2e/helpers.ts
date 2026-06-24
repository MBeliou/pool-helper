import { expect, type Page } from '@playwright/test';

// Walk the onboarding flow using the pre-filled defaults, asserting each step's
// route so the next click never races an in-flight client navigation. Lands on
// the home page (free user, web → "Maybe later" skips the paywall).
export async function completeOnboarding(page: Page): Promise<void> {
	await page.goto('/onboarding/welcome');
	await page.getByRole('button', { name: 'Set up my pool' }).click();

	await expect(page).toHaveURL(/\/onboarding\/shape/);
	await page.getByRole('button', { name: 'Next' }).click();

	await expect(page).toHaveURL(/\/onboarding\/size/);
	await page.getByRole('button', { name: 'Next' }).click();

	await expect(page).toHaveURL(/\/onboarding\/details/);
	await page.getByRole('button', { name: 'Next' }).click();

	await expect(page).toHaveURL(/\/onboarding\/units/);
	await page.getByRole('button', { name: 'Finish setup' }).click();

	await expect(page).toHaveURL(/\/onboarding\/done/);
	await page.getByRole('button', { name: 'Continue' }).click();

	await expect(page).toHaveURL(/\/onboarding\/premium/);
	await page.getByRole('button', { name: 'Maybe later' }).click();

	await expect(page).toHaveURL('/');
}
