import { test, expect } from '@playwright/test';

test.describe('Appointment Booking', () => {
    test.beforeEach(async ({ page }) => {
        // Login as Alice
        await page.goto('/login.html');
        await page.fill('#email', 'alice@medicare.test');
        await page.fill('#password', 'TestPass1!');
        await page.click('#loginBtn');
        await expect(page).toHaveURL(/.*dashboard.html/);
    });

    test('Patient can book an appointment', async ({ page }) => {
        await page.goto('/doctor_booking.html');
        
        // Wait for doctors
        await page.waitForSelector('.doctor-card', { timeout: 10000 });
        
        // Find the first doctor and click book
        const bookBtn = page.locator('button', { hasText: /Book Appointment/ }).first();
        await bookBtn.click();
        
        // Modal should appear
        await expect(page.locator('#bookingModal')).toBeVisible();
        
        // Select hospital
        await page.selectOption('#hospitalSelect', { index: 1 });
        
        // Select a future date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        await page.fill('#apptDate', dateStr);
        
        // Wait for slots to populate
        await page.waitForTimeout(1000);
        
        // Select time
        const apptTime = page.locator('#apptTime');
        await expect(apptTime).not.toBeDisabled();
        await apptTime.selectOption({ index: 1 });
        
        // Confirm
        await page.click('#bookBtn');
        
        // Verification
        await expect(page.locator('text=Appointment booked')).toBeVisible();
        await expect(page).toHaveURL(/.*dashboard.html/);
    });
});
