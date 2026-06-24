import { render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationDetailContent } from '../src/features/location/LocationDetailContent';
import { clearPhotoStore, savePhoto } from '../src/lib/repository';

describe('location detail content', () => {
  const createObjectUrl = vi.fn(() => 'blob:bike-photo');
  const revokeObjectUrl = vi.fn();

  beforeEach(async () => {
    window.localStorage.clear();
    await clearPhotoStore();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    createObjectUrl.mockClear();
    revokeObjectUrl.mockClear();
  });

  it('renders a persisted outside photo after the async photo lookup resolves', async () => {
    const photoId = await savePhoto(new File(['bike-photo'], 'bike.png', { type: 'image/png' }));

    render(
      <LocationDetailContent
        entry={{
          id: 'outside-1',
          mode: 'outside',
          outsideDescription: 'At the fence by the exit',
          photoId,
          stationName: 'My station',
          updatedAt: '2026-04-20T20:00:00.000Z',
        }}
        photoAlt="Saved bike reference"
      />,
    );

    expect(await screen.findByAltText(/saved bike reference/i)).toHaveAttribute(
      'src',
      'blob:bike-photo',
    );
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
  });

  it('renders an Open in Maps link when coordinates are present', () => {
    render(
      <LocationDetailContent
        entry={{
          id: 'outside-coords',
          mode: 'outside',
          outsideDescription: 'By the canal',
          stationName: 'My station',
          updatedAt: '2026-04-20T20:00:00.000Z',
          coords: { lat: 52.379189, lng: 4.899431, accuracy: 12 },
        }}
        photoAlt="Saved bike reference"
      />,
    );

    const link = screen.getByRole('link', { name: /open in maps/i });
    expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=52.379189,4.899431',
    );
    expect(screen.getByText('±12m')).toBeInTheDocument();
  });

  it('renders no maps link when coordinates are absent', () => {
    render(
      <LocationDetailContent
        entry={{
          id: 'outside-no-coords',
          mode: 'outside',
          outsideDescription: 'By the canal',
          stationName: 'My station',
          updatedAt: '2026-04-20T20:00:00.000Z',
        }}
        photoAlt="Saved bike reference"
      />,
    );

    expect(screen.queryByRole('link', { name: /open in maps/i })).not.toBeInTheDocument();
  });
});
