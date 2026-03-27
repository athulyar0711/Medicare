import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.context().clearCookies();
    });

    test('User Registration - Patient', async ({ page }) => {
        await page.goto('/signup.html');
        await page.waitForURL('**/signup.html');
        
        const timestamp = Date.now();
        await page.fill('#name', 'New E2E Patient');
        await page.fill('#email', `new_patient_${timestamp}@medicare.test`);
        await page.fill('#password', 'TestPass1!');
        await page.selectOption('#role', 'patient');
        await page.fill('#phone', '9876543210');
        
        await page.click('#signupBtn');
        
        await expect(page).toHaveURL(/.*dashboard.html/);
        await expect(page.locator('#userName')).toContainText('New E2E Patient');
    });

    test('User Login - Valid Credentials', async ({ page }) => {
        await page.goto('/login.html');
        await page.waitForURL('**/login.html');
        
        // Seeded Alice
        await page.fill('#email', 'alice@medicare.test');
        await page.fill('#password', 'TestPass1!');
        await page.click('#loginBtn');
        
        await expect(page).toHaveURL(/.*dashboard.html/);
        await expect(page.locator('#userName')).toContainText('Alice');
    });

    test('User Login - Invalid Credentials', async ({ page }) => {
        await page.goto('/login.html');
        await page.waitForURL('**/login.html');
        
        await page.fill('#email', 'wrong@medicare.test');
        await page.fill('#password', 'WrongPass');
        await page.click('#loginBtn');
        
        await expect(page.locator('text=Invalid email or password.')).toBeVisible();
    });
});
