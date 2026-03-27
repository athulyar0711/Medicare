import { test, expect } from '@playwright/test';

test.describe('Health Reminders', () => {
    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['notifications']);
        
        await page.goto('/login.html');
        await page.fill('#email', 'alice@medicare.test');
        await page.fill('#password', 'TestPass1!');
        await page.click('#loginBtn');
        await expect(page).toHaveURL(/.*dashboard.html/);
    });

    test('Patient can create a reminder', async ({ page }) => {
        await page.goto('/reminders.html');
        
        await page.fill('#reminderTitle', 'E2E Water Alert');
        await page.fill('#reminderInterval', '30');
        await page.click('button:has-text("Create Reminder")');
        
        await expect(page.locator('text=Reminder created')).toBeVisible();
        await expect(page.locator('#remindersList')).toContainText('E2E Water Alert');
    });

    test('Patient can use a quick preset', async ({ page }) => {
        await page.goto('/reminders.html');
        
        await page.click('button:has-text("Water (2h)")');
        await expect(page.locator('text=Water reminder created')).toBeVisible();
    });
});
