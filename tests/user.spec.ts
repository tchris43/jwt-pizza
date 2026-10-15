import { test, expect } from 'playwright-test-coverage';
import type { Page } from '@playwright/test';

async function registerUser(page: Page, name = 'pizza diner') {
  const email = `user-${crypto.randomUUID()}@jwt.com`;
  const password = 'diner';

  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill(name);
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Register' }).click();

  return { email, password };
}

async function logoutUser(page: Page) {
  await page.getByRole('link', { name: 'Logout' }).click();
}

async function loginUser(page: Page, email: string, password: string) {
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

test('updateUser', async ({ page }) => {
  const { email, password } = await registerUser(page);

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza diner');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza diner');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  await logoutUser(page);
  await loginUser(page, email, password);

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  
});

test('change password and email address', async ({ page }) => {
  const { email, password } = await registerUser(page);
  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza diner');

  await page.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('h3')).toContainText('Edit user');

  const updatedEmail = email.replace('@', '+updated@');
  const updatedPassword = `${password}-updated`;
  const fields = dialog.getByRole('textbox');
  await fields.nth(1).fill(updatedEmail);
  await fields.nth(2).fill(updatedPassword);
  await dialog.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText(updatedEmail);

  await logoutUser(page);
  await loginUser(page, updatedEmail, updatedPassword);
  await expect(page.getByRole('link', { name: 'pd' })).toBeVisible();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText(updatedEmail);

  await logoutUser(page);
  await loginUser(page, updatedEmail, password);
  await expect(page.getByText(/"code":\d+/)).toBeVisible();
});

test('change user information as admin', async ({ page }) => {
  const email = 'admin@jwt.com';
  const password = 'admin';
  const updatedEmail = email.replace('@', '+updated@');
  const updatedPassword = `${password}-updated`;

  await page.goto('/');
  await loginUser(page, email, password);
  await page.locator('a[href="/diner-dashboard"]').click();

  await page.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog');
  const fields = dialog.getByRole('textbox');
  await fields.nth(1).fill(updatedEmail);
  await fields.nth(2).fill(updatedPassword);
  await dialog.getByRole('button', { name: 'Update' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('main')).toContainText(updatedEmail);

  await logoutUser(page);
  await loginUser(page, updatedEmail, updatedPassword);
  await page.locator('a[href="/diner-dashboard"]').click();
  await expect(page.getByRole('main')).toContainText(updatedEmail);

  await logoutUser(page);
  await loginUser(page, updatedEmail, password);
  await expect(page.getByText(/"code":\d+/)).toBeVisible();
});

test('change user information as franchise', async ({ page }) => {
  const email = 'franchise@jwt.com';
  const password = 'franchise';
  const updatedEmail = email.replace('@', '+updated@');
  const updatedPassword = `${password}-updated`;

  await page.goto('/');
  await loginUser(page, email, password);
  await page.locator('a[href="/diner-dashboard"]').click();

  await page.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog');
  const fields = dialog.getByRole('textbox');
  await fields.nth(1).fill(updatedEmail);
  await fields.nth(2).fill(updatedPassword);
  await dialog.getByRole('button', { name: 'Update' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('main')).toContainText(updatedEmail);

  await logoutUser(page);
  await loginUser(page, updatedEmail, updatedPassword);
  await page.locator('a[href="/diner-dashboard"]').click();
  await expect(page.getByRole('main')).toContainText(updatedEmail);

  await logoutUser(page);
  await loginUser(page, updatedEmail, password);
  await expect(page.getByText(/"code":\d+/)).toBeVisible();
});
