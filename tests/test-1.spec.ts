import { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
import { Role, User } from '../src/service/pizzaService';

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  // Added an admin fixture so the admin-only dashboard route can be exercised.
  const validUsers: Record<string, User> = {
    'd@jwt.com': { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] },
    'admin@jwt.com': { id: '1', name: 'Mama Ricci', email: 'admin@jwt.com', password: 'admin', roles: [{ role: Role.Admin }] },
    // Added a franchisee fixture for the store-management workflow.
    'franchise@jwt.com': { id: '2', name: 'Frank Franchise', email: 'franchise@jwt.com', password: 'franchise', roles: [{ role: Role.Franchisee }] },
  };

  await page.route('*/**/api/auth', async (route) => {
    // Rebuild this mock step by step.
    const method = route.request().method();
    if (method === 'PUT') {
      // login
      const authReq = route.request().postDataJSON();
      const user = validUsers[authReq.email];

      if (!user || user.password !== authReq.password) {
        await route.fulfill({
          status: 401,
          json: { error: 'Unauthorized' },
        });
        return;
      }

      loggedInUser = user;

      await route.fulfill({
        json: {
          user: loggedInUser,
          token: 'abcdef',
        },
      });

    } else if (method === 'POST') {
      // registration
      const authReq = route.request().postDataJSON();
    } else if (method === 'DELETE') {
      // logout
    }
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    // Added admin/store metadata needed by the admin dashboard table.
    const allFranchises = [
      {
        id: 2,
        name: 'LotaPizza',
        admins: [{ email: 'admin@jwt.com', name: 'Mama Ricci' }],
        stores: [
          { id: 4, name: 'Lehi', totalRevenue: 50 },
          { id: 5, name: 'Springville', totalRevenue: 75 },
          { id: 6, name: 'American Fork', totalRevenue: 100 },
        ],
      },
      { id: 3, name: 'PizzaCorp', admins: [{ email: 'corp@jwt.com', name: 'Pizza Corp Admin' }], stores: [{ id: 7, name: 'Spanish Fork', totalRevenue: 125 }] },
      { id: 4, name: 'topSpot', admins: [], stores: [] },
    ];

    // Added query-sensitive behavior so the test can verify filtering, not just rendering.
    const nameFilter = new URL(route.request().url()).searchParams.get('name');
    const franchises = nameFilter === '*Lota*' ? allFranchises.filter((franchise) => franchise.name === 'LotaPizza') : allFranchises;
    const franchiseRes = {
      franchises,
      more: nameFilter !== '*Lota*',
    };
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  // Added franchisee-specific state and endpoint mocks for viewing, creating, and closing stores.
  let franchiseStores = [{ id: 8, name: 'Lehi', totalRevenue: 50 }];

  await page.route(/\/api\/franchise\/2$/, async (route) => {
    expect(route.request().method()).toBe('GET');

    await route.fulfill({
      json: [
        {
          id: 2,
          name: 'Frank Franchise Pizza',
          stores: franchiseStores,
        },
      ],
    });
  });

  await page.route(/\/api\/franchise\/2\/store(?:\/\d+)?$/, async (route) => {
    const method = route.request().method();

    if (method == 'POST') {
      const storeRequest = route.request().postDataJSON();

      expect(storeRequest).toEqual({
        id: '',
        name: 'Provo',
      });

      const newStore = {
        id: 9,
        name: storeRequest.name,
        totalRevenue: 0,
      };

      franchiseStores = [...franchiseStores, newStore];

      await route.fulfill({ json: newStore});
      return;
    }

    expect(method).toBe('DELETE');

    franchiseStores = franchiseStores.filter(
      (store) => !route.request().url().endsWith(`/store/${store.id}`)
    );

    await route.fulfill({json:null});
  });

  await page.route('*/**/api/order', async (route) => {
    const method = route.request().method();

    // Added order-history data for the diner dashboard test.
    if (method === 'GET') {
      await route.fulfill({
        json: {
          orders: [{ id: 23, items: [{ description: 'Veggie', price: 0.0038 }], date: '2026-01-01T00:00:00.000Z' }],
        },
      });
      return;
    }

    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: { ...orderReq, id: 23 },
      jwt: 'eyJpYXQ',
    };
    expect(method).toBe('POST');
    await route.fulfill({ json: orderRes });
  });

  await page.route('*/**/api/order/verify', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ jwt: 'eyJpYXQ' });
    await route.fulfill({
      json: {
        message: 'valid',
        payload: { orderId: 23, storeId: '4' },
      },
    });
  });

  await page.goto('/');
}

test('login', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('registration succeeds', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Register' }).click();

  await expect(page.locator('h2')).toContainText('Welcome to the party');
  await page.getByPlaceholder('Full name').fill('Taylor Tester');
  await page.getByPlaceholder('Email address').fill('new@jwt.com');
  await page.getByPlaceholder('Password').fill('b');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('link', { name: 'TT' })).toBeVisible();
});

test('registration failure displays an error', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Register' }).click();

  await page.getByPlaceholder('Full name').fill('Taylor Tester');
  await page.getByPlaceholder('Email address').fill('taken@jwt.com');
  await page.getByPlaceholder('Password').fill('b');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByText('Email already registered')).toBeVisible();
  await expect(page.locator('h2')).toContainText('Welcome to the party');
});

// Added coverage for the admin-only dashboard, franchise table, filtering, and create-franchise navigation.
test('admin can view and filter franchises', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('admin@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  // Added assertions for the admin dashboard branch and rendered franchise/store data.
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.locator('h2')).toContainText("Mama Ricci's kitchen");
  await expect(page.getByRole('main')).toContainText('LotaPizza');
  await expect(page.getByRole('main')).toContainText('PizzaCorp');
  await expect(page.getByRole('main')).toContainText('Lehi');
  await expect(page.getByRole('main')).toContainText('Mama Ricci');
  await expect(page.getByRole('main')).toContainText('50');

  // Added coverage for filterFranchises and verification of the filtered result set.
  await page.getByPlaceholder('Filter franchises').fill('Lota');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('main')).toContainText('LotaPizza');
  await expect(page.getByRole('main')).not.toContainText('PizzaCorp');
  await expect(page.getByRole('main')).not.toContainText('topSpot');

  // Added coverage for the admin dashboard's create-franchise navigation.
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await expect(page.locator('h2')).toContainText('Create franchise');
});

// Added coverage for the franchisee dashboard and the create/close store views.
test('franchisee can create and close a store', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('franchise@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('franchise');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByRole('heading', { name: 'Frank Franchise Pizza' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Lehi');
  await expect(page.getByRole('main')).toContainText('50');

  // Added coverage for submitting the create-store form and returning to the dashboard.
  await page.getByRole('button', { name: 'Create store' }).click();
  await expect(page.locator('h2')).toContainText('Create store');
  await page.getByPlaceholder('store name').fill('Provo');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('heading', { name: 'Frank Franchise Pizza' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Provo');

  // Added coverage for selecting a store and submitting the close-store confirmation.
  const provoRow = page.locator('tr').filter({ hasText: 'Provo' });
  await provoRow.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('h2')).toContainText('Sorry to see you go');
  await expect(page.getByRole('main')).toContainText('Provo');
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByRole('heading', { name: 'Frank Franchise Pizza' })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('Provo');
});

// Added coverage for loading and displaying a logged-in diner's order history.
test('diner can view order history', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'KC' }).click();

  await expect(page.locator('h2')).toContainText('Your pizza kitchen');
  await expect(page.getByRole('main')).toContainText('Here is your history of all the good times.');
  await expect(page.locator('tbody')).toContainText('23');
  await expect(page.locator('tbody')).toContainText('0.004');
});

test('purchase with login', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('button', { name: 'Order now' }).click();

  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByText('0.008')).toBeVisible();
  await expect(page.locator('h2')).toContainText('Here is your JWT Pizza!');
  await expect(page.getByText('order ID:').locator('..')).toContainText('23');
  await expect(page.getByText('pie count:').locator('..')).toContainText('2');
  await expect(page.getByText('total:').locator('..')).toContainText('0.008');
  await expect(page.getByText('eyJpYXQ')).toBeVisible();

  await page.getByRole('button', { name: 'Verify' }).click();

  await expect(page.locator('#hs-jwt-modal')).toContainText('JWT Pizza - valid');
  await expect(page.locator('#hs-jwt-modal')).toContainText('23');
});
