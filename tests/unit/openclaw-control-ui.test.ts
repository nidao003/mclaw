import { describe, expect, it } from 'vitest';

import { buildOpenClawControlUiUrl } from '@electron/utils/mclaw-control-ui';

describe('buildOpenClawControlUiUrl', () => {
  it('uses the URL fragment for one-time token bootstrap', () => {
    expect(buildOpenClawControlUiUrl(18999, 'mclaw-test-token')).toBe(
      'http://127.0.0.1:18999/#token=mclaw-test-token',
    );
  });

  it('omits the fragment when the token is blank', () => {
    expect(buildOpenClawControlUiUrl(18999, '   ')).toBe('http://127.0.0.1:18999/');
  });

  it('opens the Dreams view without moving the token out of the fragment', () => {
    expect(buildOpenClawControlUiUrl(18999, 'mclaw-test-token', { view: 'dreams' })).toBe(
      'http://127.0.0.1:18999/dreaming#token=mclaw-test-token',
    );
  });

  it('opens the Dreams view without a fragment when the token is blank', () => {
    expect(buildOpenClawControlUiUrl(18999, '   ', { view: 'dreams' })).toBe(
      'http://127.0.0.1:18999/dreaming',
    );
  });
});
