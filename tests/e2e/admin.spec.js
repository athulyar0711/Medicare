import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login.html');
        // Default admin from schema_test.sql
        await page.fill('#email', 'admin@medicare.test');
        await page.fill('#password', 'TestPass1!');
        await page.click('#loginBtn');
        await expect(page).toHaveURL(/.*admin_dashboard.html/);
    });

    test('Admin can see system statistics and manage data', async ({ page }) => {
        await page.waitForLoadState('networkidle');
        // Statistics
        await expect(page.locator('#totalDoctors')).not.toHaveText('-', { timeout: 30000 });
        await expect(page.locator('#totalHospitals')).not.toHaveText('-');
        
        // Hospitals management
        await page.click('button:has-text("Hospitals")');
        await expect(page.locator('#hospitalsList table')).toBeVisible();
        
        // Check Add Hospital tab
        await page.click('button:has-text("Add Hospital")');
        await expect(page.locator('#addHospitalForm')).toBeVisible();
    });
});
