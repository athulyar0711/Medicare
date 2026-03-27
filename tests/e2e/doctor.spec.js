import { test, expect } from '@playwright/test';

test.describe('Doctor Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login.html');
        // Seeded Rahul the Doctor
        await page.fill('#email', 'rahul@medicare.test');
        await page.fill('#password', 'TestPass1!');
        await page.click('#loginBtn');
        await expect(page).toHaveURL(/.*doctor_dashboard.html/);
    });

    test('Doctor can see appointments and search patients', async ({ page }) => {
        // Check stats
        await expect(page.locator('#totalCount')).toBeVisible({ timeout: 10000 });
        
        // Switch to Appointments tab
        await page.click('button:has-text("Appointments")');
        await expect(page.locator('#todayAppointments')).toBeVisible();
        
        // Switch back to Patients and search
        await page.click('button:has-text("Patients")');
        await page.fill('#patientName', 'Alice');
        // Click the search button inside the search-bar
        await page.click('.search-bar button:has-text("Search")');
        
        // Wait for results
        await page.waitForSelector('.patient-card', { timeout: 10000 });
        await expect(page.locator('#patientsList')).toContainText('Alice');
    });

    test('Doctor can manage their schedule', async ({ page }) => {
        await page.click('button:has-text("My Schedule")');
        await expect(page.locator('#scheduleForm')).toBeVisible();
        await expect(page.locator('#scheduleList')).toBeVisible();
    });
});
