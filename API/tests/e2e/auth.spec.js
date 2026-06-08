const { test, expect } = require('@playwright/test');

test('login page loads and exposes registration journey', async ({ page }) => {
    await page.goto('/view/authentification/login.html');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('link', { name: /créer|creer|inscrire/i }).first()).toBeVisible();
});
