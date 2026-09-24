import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Messages } from './translator';

const loadLocalMessages = vi.hoisted(() => vi.fn<() => Promise<Messages | null>>());
const loadRemoteMessages = vi.hoisted(() => vi.fn<() => Promise<Messages | null>>());

vi.mock('./local', () => ({ loadLocalMessages }));
vi.mock('./remote', () => ({ loadRemoteMessages }));

import { loadMessages } from './messages';

describe('loadMessages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    delete (globalThis as Record<symbol, unknown>)[Symbol.for('cv.i18n.listLengthReported')];
  });

  const merge = async (local: Messages, remote: Messages) => {
    loadLocalMessages.mockResolvedValue(local);
    loadRemoteMessages.mockResolvedValue(remote);
    return loadMessages('en');
  };

  it('layers the export over the committed copy key by key', async () => {
    const messages = await merge(
      { cv: { identity: { title: 'Engineer', location: 'Bilbao' } } },
      { cv: { identity: { title: 'Ingeniero' } } }
    );

    expect(messages).toEqual({ cv: { identity: { title: 'Ingeniero', location: 'Bilbao' } } });
  });

  it('keeps the fields of a list entry the export did not carry', async () => {
    const messages = await merge(
      { cv: { stages: [{ step: '01', title: 'Before the commit', text: 'Husky runs.' }] } },
      { cv: { stages: [{ text: 'Husky ejecuta.' }] } }
    );

    expect(messages).toEqual({
      cv: { stages: [{ step: '01', title: 'Before the commit', text: 'Husky ejecuta.' }] },
    });
  });

  it('keeps the committed list when the export carries fewer entries', async () => {
    const messages = await merge(
      { cv: { bullets: ['one', 'two', 'three'] } },
      { cv: { bullets: ['uno', 'dos'] } }
    );

    expect(messages).toEqual({ cv: { bullets: ['one', 'two', 'three'] } });
  });

  it('keeps the committed list when the export carries more entries', async () => {
    const messages = await merge(
      { cv: { bullets: ['one', 'two'] } },
      { cv: { bullets: ['uno', 'dos', 'tres'] } }
    );

    expect(messages).toEqual({ cv: { bullets: ['one', 'two'] } });
  });

  it('names the list it kept, once per process', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await merge({ cv: { bullets: ['one', 'two'] } }, { cv: { bullets: ['uno'] } });
    await merge({ cv: { bullets: ['one', 'two'] } }, { cv: { bullets: ['uno'] } });

    const mismatches = stdout.mock.calls
      .map(([line]) => JSON.parse(String(line)))
      .filter((record) => record.event === 'i18n.list_length_mismatch');

    expect(mismatches).toEqual([
      expect.objectContaining({ key: 'cv.bullets', committed: 2, remote: 1 }),
    ]);
  });

  it('takes the export list when it matches the committed one entry for entry', async () => {
    const messages = await merge(
      { cv: { bullets: ['one', 'two'] } },
      { cv: { bullets: ['uno', 'dos'] } }
    );

    expect(messages).toEqual({ cv: { bullets: ['uno', 'dos'] } });
  });
});
