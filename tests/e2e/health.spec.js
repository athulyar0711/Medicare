import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Health Metrics & AI Chat', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login.html');
        await page.fill('#email', 'alice@medicare.test');
        await page.fill('#password', 'TestPass1!');
        await page.click('#loginBtn');
        await expect(page).toHaveURL(/.*dashboard.html/);
    });

    test('Patient can calculate and save BMI', async ({ page }) => {
        await page.goto('/dashboard.html');
        
        await page.fill('#height', '175');
        await page.fill('#weight', '70');
        await page.click('button:has-text("Calculate BMI")');
        
        await expect(page.locator('#bmiValue')).toContainText('22.9');
        await expect(page.locator('#bmiCategory')).toContainText('Normal');
    });

    test('Patient can upload a report in AI Chat', async ({ page }) => {
        // Mock the chat API to be deterministic
        await page.route('**/api/chat', async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ reply: 'Mocked AI Analysis: Your report looks normal.' })
                });
            } else {
                await route.continue();
            }
        });

        await page.goto('/chatbot.html');
        
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#fileUploadBtn');
        const fileChooser = await fileChooserPromise;
        
        const filePath = path.join(process.cwd(), 'tests', 'fixtures', 'sample_report.jpg');
        await fileChooser.setFiles(filePath);
        
        await expect(page.locator('#fileUploadWrapper')).toHaveClass(/file-uploaded/);
        
        await page.fill('#messageInput', 'Analyze this report');
        await page.click('#sendMessageBtn');
        
        await expect(page.locator('.bot-message .message-text')).not.toHaveText('...', { timeout: 30000 });
    });
});
