import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@mclaw/shared';
import { UserMenu } from '@/components/layout/UserMenu';
import { useAccountStore } from '@/stores/account';
import { useSettingsStore } from '@/stores/settings';

describe('UserMenu', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, loading: false, error: null });
    useAccountStore.setState({
      plans: [],
      subscription: null,
      wallet: null,
      loading: false,
      error: null,
      fetchAll: async () => undefined,
    });
    useSettingsStore.setState({ settingsSheetOpen: false });
  });

  it('refreshes account summary when a user is available', async () => {
    const fetchAll = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'yaoyao@example.com',
        name: '夭夭',
        role: 'user',
        created_at: '2026-01-01T00:00:00Z',
      },
    });
    useAccountStore.setState({ fetchAll });

    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchAll).toHaveBeenCalledTimes(1));
  });

  it('opens the settings dialog from the user menu', async () => {
    const fetchAll = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'yaoyao@example.com',
        name: '夭夭',
        role: 'user',
        created_at: '2026-01-01T00:00:00Z',
      },
    });
    useAccountStore.setState({ fetchAll });

    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('user-menu-trigger'));
    fireEvent.click(screen.getByTestId('sidebar-nav-settings'));

    expect(useSettingsStore.getState().settingsSheetOpen).toBe(true);
  });
});
