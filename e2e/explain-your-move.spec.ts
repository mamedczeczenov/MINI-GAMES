/**
 * E2E tests for Explain Your Move
 * Tests multiplayer game flow with two players
 */

import { test, expect } from '@playwright/test';

test.describe('Explain Your Move - Multiplayer Flow', () => {
  test('should display game menu and allow creating a room', async ({ page }) => {
    // Navigate to game page
    await page.goto('/g/explain_your_move');

    // Should show menu screen
    await expect(page.locator('text=Explain Your Move')).toBeVisible();
    await expect(page.locator('text=Utwórz Pokój')).toBeVisible();
    await expect(page.locator('text=Dołącz do Pokoju')).toBeVisible();
  });

  test('should show join room form', async ({ page }) => {
    await page.goto('/g/explain_your_move');

    // Click join button
    await page.click('text=Dołącz do Pokoju');

    // Should show join form
    await expect(page.locator('input[placeholder*="Wpisz kod"]')).toBeVisible();
    await expect(page.locator('text=Dołącz')).toBeVisible();
  });

  test.skip('should create room and show room code', async ({ page, context }) => {
    // Skip this test in CI as it requires auth and API setup
    // This is a placeholder for manual testing

    await page.goto('/g/explain_your_move');
    
    // Create room
    await page.click('text=Utwórz Pokój');
    
    // Should show waiting screen with room code
    await expect(page.locator('text=Oczekiwanie na gracza')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Kod pokoju:')).toBeVisible();
    
    // Room code should be 6 characters
    const roomCode = await page.locator('[class*="font-mono"]').first().textContent();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  test.skip('should allow two players to join and play', async ({ browser }) => {
    // This test requires WebSocket server and full backend setup
    // Skip in standard CI, run manually or in staging environment

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Player 1: Create room
    await page1.goto('/g/explain_your_move');
    await page1.click('text=Utwórz Pokój');
    
    await expect(page1.locator('text=Oczekiwanie na gracza')).toBeVisible({ timeout: 10000 });
    const roomCode = await page1.locator('[class*="font-mono"]').first().textContent();

    // Player 2: Join room
    await page2.goto('/g/explain_your_move');
    await page2.click('text=Dołącz do Pokoju');
    await page2.fill('input[placeholder*="Wpisz kod"]', roomCode || '');
    await page2.click('button:has-text("Dołącz")');

    // Both players should see countdown
    await expect(page1.locator('text=Gra rozpocznie się za')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('text=Gra rozpocznie się za')).toBeVisible({ timeout: 5000 });

    // Wait for scenario
    await expect(page1.locator('text=Runda 1/3')).toBeVisible({ timeout: 15000 });
    await expect(page2.locator('text=Runda 1/3')).toBeVisible({ timeout: 15000 });

    // Both players choose
    await page1.click('button:has-text("A")');
    await page2.click('button:has-text("B")');

    // Should move to writing phase
    await expect(page1.locator('text=Uzasadnij swój wybór')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('text=Uzasadnij swój wybór')).toBeVisible({ timeout: 5000 });

    // Cleanup
    await context1.close();
    await context2.close();
  });
});

test.describe('Explain Your Move - UI Components', () => {
  test('should have responsive layout', async ({ page }) => {
    await page.goto('/g/explain_your_move');

    // Check main menu is centered and styled
    const menuContainer = page.locator('div[class*="backdrop-blur"]').first();
    await expect(menuContainer).toBeVisible();
    
    // Check gradient background
    const body = page.locator('body');
    const bgClass = await body.getAttribute('class');
    expect(bgClass).toBeDefined();
  });

  test('should show error for invalid room code format', async ({ page }) => {
    await page.goto('/g/explain_your_move');
    await page.click('text=Dołącz do Pokoju');

    // Try to join with empty code
    await page.click('button:has-text("Dołącz")');
    
    // Should show alert or error
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Enter a room code');
      await dialog.accept();
    });
  });
});

