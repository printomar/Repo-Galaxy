import { describe, expect, it } from 'vitest';
import { buildRepoFromTree, detectExtension, extractImportSpecifiers, parseGitHubUrl, resolveImportPath } from './github';

describe('parseGitHubUrl', () => {
  it('parses normal public repo URLs', () => {
    expect(parseGitHubUrl('https://github.com/acme/widgets')).toEqual({ owner: 'acme', repo: 'widgets' });
    expect(parseGitHubUrl('github.com/acme/widgets.git')).toEqual({ owner: 'acme', repo: 'widgets' });
  });

  it('rejects non GitHub repo URLs', () => {
    expect(() => parseGitHubUrl('https://example.com/acme/widgets')).toThrow(/GitHub repo URL/);
  });
});

describe('buildRepoFromTree', () => {
  it('creates root, folder, and file nodes with stable parents', () => {
    const repo = buildRepoFromTree(
      [
        { path: 'src/App.tsx', mode: '100644', type: 'blob', sha: '1', size: 100, url: '' },
        { path: 'src/components/Button.tsx', mode: '100644', type: 'blob', sha: '2', size: 200, url: '' },
        { path: 'README.md', mode: '100644', type: 'blob', sha: '3', size: 300, url: '' },
      ],
      'acme',
      'widgets',
      { description: 'demo', stars: 1, language: 'TypeScript', defaultBranch: 'main' },
    );

    expect(repo.nodes.find((node) => node.id === 'root')?.name).toBe('widgets');
    expect(repo.nodes.find((node) => node.id === 'src')?.parent).toBe('root');
    expect(repo.nodes.find((node) => node.id === 'src_components')?.parent).toBe('src');
    expect(repo.nodes.find((node) => node.path === '/src/App.tsx')?.ext).toBe('tsx');
  });
});

describe('detectExtension', () => {
  it('handles special files', () => {
    expect(detectExtension('Dockerfile')).toBe('docker');
    expect(detectExtension('.gitignore')).toBe('gitignore');
    expect(detectExtension('README.md')).toBe('md');
  });
});

describe('extractImportSpecifiers', () => {
  it('extracts static, export, dynamic, and require imports', () => {
    const imports = extractImportSpecifiers(`
      import React from 'react';
      import { Button } from './components/Button';
      export { thing } from './thing';
      const Modal = import('./Modal');
      const legacy = require('../legacy');
    `);

    expect(imports).toContainEqual({ specifier: './components/Button', type: 'import' });
    expect(imports).toContainEqual({ specifier: './thing', type: 'import' });
    expect(imports).toContainEqual({ specifier: './Modal', type: 'dynamic-import' });
    expect(imports).toContainEqual({ specifier: '../legacy', type: 'require' });
  });
});

describe('resolveImportPath', () => {
  const paths = new Set(['src/components/Button.tsx', 'src/thing/index.ts', 'legacy.js']);

  it('resolves extensionless relative files and index files', () => {
    expect(resolveImportPath('/src/App.tsx', './components/Button', paths)).toBe('src/components/Button.tsx');
    expect(resolveImportPath('/src/App.tsx', './thing', paths)).toBe('src/thing/index.ts');
    expect(resolveImportPath('/src/App.tsx', '../legacy', paths)).toBe('legacy.js');
  });

  it('ignores package imports', () => {
    expect(resolveImportPath('/src/App.tsx', 'react', paths)).toBeNull();
  });
});
