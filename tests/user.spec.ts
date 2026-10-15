import { test, expect } from 'playwright-test-coverage';
import type { Page } from '@playwright/test';
import { Role, User } from '../src/service/pizzaService';

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
  await page.getByRole('link', { name: 'Login', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

// Give role tests a predictable API user without depending on a seeded backend account.
async function mockRoleUser(page: Page, role: Role) {
  let user: User = {
    id: role === Role.Admin ? 'admin-test' : 'franchise-test',
    name: role === Role.Admin ? 'Test Admin' : 'Test Franchisee',
    email: role === Role.Admin ? 'admin-test@jwt.com' : 'franchise-test@jwt.com',
    password: 'test-password',
    roles: [{ role }],
  };

  await page.route('**/api/auth', async (route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      const credentials = route.request().postDataJSON();
      if (credentials.email !== user.email || credentials.password !== user.password) {
        await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
        return;
      }
      await route.fulfill({ json: { user, token: 'role-test-token' } });
      return;
    }
    if (method === 'DELETE') {
      await route.fulfill({ json: {} });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });

  await page.route(`**/api/user/${user.id}`, async (route) => {
    const changes = route.request().postDataJSON();
    user = { ...user, ...changes, roles: user.roles };
    await route.fulfill({ json: { user, token: 'role-test-token' } });
  });

  await page.route('**/api/order', async (route) => {
    await route.fulfill({ json: { orders: [] } });
  });

  return { email: user.email!, password: user.password! };
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
  const { email, password } = await mockRoleUser(page, Role.Admin);
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
  await expect(page.getByText(/"code":401/)).toBeVisible();

  await loginUser(page, updatedEmail, updatedPassword);
  await page.locator('a[href="/diner-dashboard"]').click();
  await page.getByRole('button', { name: 'Edit' }).click();
  const resetDialog = page.getByRole('dialog');
  const resetFields = resetDialog.getByRole('textbox');
  await resetFields.nth(1).fill(email);
  await resetFields.nth(2).fill(password);
  await resetDialog.getByRole('button', { name: 'Update' }).click();
  await expect(resetDialog).toBeHidden();
  await logoutUser(page);
  await loginUser(page, email, password);
  await page.locator('a[href="/diner-dashboard"]').click();
  await expect(page.getByRole('main')).toContainText(email);
});

test('change user information as franchisee', async ({ page }) => {
  const { email, password } = await mockRoleUser(page, Role.Franchisee);
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
  await expect(page.getByText(/"code":401/)).toBeVisible();

  await loginUser(page, updatedEmail, updatedPassword);
  await page.locator('a[href="/diner-dashboard"]').click();
  await page.getByRole('button', { name: 'Edit' }).click();
  const resetDialog = page.getByRole('dialog');
  const resetFields = resetDialog.getByRole('textbox');
  await resetFields.nth(1).fill(email);
  await resetFields.nth(2).fill(password);
  await resetDialog.getByRole('button', { name: 'Update' }).click();
  await expect(resetDialog).toBeHidden();
  await logoutUser(page);
  await loginUser(page, email, password);
  await page.locator('a[href="/diner-dashboard"]').click();
  await expect(page.getByRole('main')).toContainText(email);
});

test('list users', async ({ page }) => {
  await mockRoleUser(page, Role.Admin);
  await page.route('**/api/franchise**', async (route) => {
    await route.fulfill({ json: { franchises: [], more: false } });
  });
  await page.route(/\/api\/user\?/, async (route) => {
    const allUsers = [
      { id: 'user-1', name: 'Sample Diner', email: 'diner@example.test', roles: [{ role: Role.Diner }] },
      { id: 'user-2', name: 'Sample Franchisee', email: 'franchisee@example.test', roles: [{ role: Role.Franchisee }] },
    ];
    const limit = Number(new URL(route.request().url()).searchParams.get('limit'));
    await route.fulfill({
      status: 200,
      json: allUsers.slice(0, limit),
    });
  });

  await page.goto('/');
  await loginUser(page, 'admin-test@jwt.com', 'test-password');
  await page.getByRole('link', { name: 'Admin', exact: true }).click();
  await expect(page.getByRole('button', { name: 'List users', exact: true })).toBeVisible();
  const usersResponse = page.waitForResponse((response) =>
    response.url().includes('/api/user?') && response.request().method() === 'GET'
  );
  await page.getByRole('button', { name: 'List users', exact: true }).click();
  expect((await usersResponse).ok()).toBe(true);

  const userResults = page.getByRole('list', { name: 'User results' });
  await expect(userResults).toBeVisible();
  await expect(userResults.getByRole('listitem')).toHaveCount(2);
  await expect(userResults).toContainText('Sample Diner');
  await expect(userResults).toContainText('Sample Franchisee');

  await page.getByRole('spinbutton', { name: 'User limit' }).fill('1');
  const limitedUsersResponse = page.waitForResponse((response) =>
    response.url().includes('/api/user?') && response.request().method() === 'GET'
  );
  await page.getByRole('button', { name: 'List users', exact: true }).click();
  const response = await limitedUsersResponse;
  expect(response.ok()).toBe(true);
  expect(new URL(response.url()).searchParams.get('limit')).toBe('1');
  await expect(userResults.getByRole('listitem')).toHaveCount(1);
  await expect(userResults).toContainText('Sample Diner');
  await expect(userResults).not.toContainText('Sample Franchisee');
});
