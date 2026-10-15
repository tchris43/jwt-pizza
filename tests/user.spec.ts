import { test, expect } from 'playwright-test-coverage';
import type { Page } from '@playwright/test';

async function registerUser(page: Page, name = 'pizza diner') {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
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

  //verify that the email shows up in the user info as the new email

  //logout and login with the new password and expect no error to be thrown

  await page.getByRole('link', { name: 'pd' }).click();

  //await expect new email visible

  //expect logout and login with old password to throw error
});

test('change user information using different roles', async ({ page }) => {
  await registerUser(page);
});
