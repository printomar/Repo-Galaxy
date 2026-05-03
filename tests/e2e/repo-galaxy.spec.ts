import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://api.github.com/repos/example/mini', async (route) => {
    await route.fulfill({
      json: {
        name: 'mini',
        owner: { login: 'example' },
        description: 'Mock public repo',
        stargazers_count: 42,
        language: 'TypeScript',
        default_branch: 'main',
      },
    });
  });

  await page.route('https://api.github.com/repos/example/mini/git/trees/main?recursive=1', async (route) => {
    await route.fulfill({
      json: {
        truncated: false,
        tree: [
          { path: 'src/index.ts', mode: '100644', type: 'blob', sha: '1', size: 70, url: '' },
          { path: 'src/App.tsx', mode: '100644', type: 'blob', sha: '2', size: 84, url: '' },
          { path: 'src/components/Button.tsx', mode: '100644', type: 'blob', sha: '3', size: 40, url: '' },
          { path: 'package.json', mode: '100644', type: 'blob', sha: '4', size: 120, url: '' },
        ],
      },
    });
  });

  await page.route('https://raw.githubusercontent.com/example/mini/main/**', async (route) => {
    const url = route.request().url();
    const body = url.endsWith('/src/index.ts')
      ? "import App from './App';\n"
      : url.endsWith('/src/App.tsx')
        ? "import { Button } from './components/Button';\nexport default function App(){ return Button(); }"
        : 'export function Button(){ return null; }';
    await route.fulfill({ body, contentType: 'text/plain' });
  });
});

test('renders the demo galaxy and core controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Repo Galaxy')).toBeVisible();
  await expect(page.locator('g.node').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('g.node')).toHaveCount(69);

  await page.getByRole('button', { name: 'Orbital' }).click();
  await expect(page.locator('.nav-btn.primary')).toContainText('Orbital');
  await page.getByRole('button', { name: 'Constellation' }).click();
  await expect(page.locator('.nav-btn.primary')).toContainText('Constellation');

  await page.locator('g.node').nth(1).evaluate((node) => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 700, clientY: 420 }));
  });
  await expect(page.getByRole('complementary')).toBeVisible();
  await expect(page.getByText('Solar System')).toBeVisible();

  await page.getByRole('button', { name: '.css' }).click();
  await expect(page.getByRole('button', { name: '.css' })).toHaveCSS('opacity', '0.3');
});

test('loads a public GitHub URL path and creates dependency links', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('github.com/owner/repo').fill('github.com/example/mini');
  await page.getByRole('button', { name: /launch/i }).click();

  await expect(page.locator('.repo-bar-item.owner')).toHaveText('example');
  await expect(page.locator('.repo-bar-item.name')).toHaveText('mini');
  await expect(page.getByText('files')).toBeVisible();
  await expect(page.locator('.meta-item').filter({ hasText: 'deps' })).toContainText('2');
  await expect(page.getByText('Loaded example/mini')).toBeVisible();

  await page.getByRole('button', { name: /share map/i }).click();
  await expect(page.getByText('Share URL copied')).toBeVisible();
  await expect(page).toHaveURL(/owner=example&repo=mini/);
});
