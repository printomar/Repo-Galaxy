import type { ViewMode } from '../types';

export interface UrlState {
  owner?: string;
  repo?: string;
  view?: ViewMode;
  filters?: string[];
}

export function readUrlState(search = window.location.search): UrlState {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  return {
    owner: params.get('owner') || undefined,
    repo: params.get('repo') || undefined,
    view: view === 'force' || view === 'orbital' || view === 'constellation' ? view : undefined,
    filters: params.get('filters')?.split(',').filter(Boolean) || undefined,
  };
}

export function writeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  if (state.owner) params.set('owner', state.owner);
  if (state.repo) params.set('repo', state.repo);
  if (state.view) params.set('view', state.view);
  if (state.filters?.length) params.set('filters', state.filters.join(','));
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', next);
  return window.location.href;
}
