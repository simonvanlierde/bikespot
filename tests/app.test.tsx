import { act, fireEvent, render, screen, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../src/App';

describe('bike storage tracker app', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the current spot card and quick actions', () => {
    render(<App />);

    const currentSpotCard = screen.getByRole('region', {
      name: /current spot/i,
    });
    const quickActions = screen.getByRole('region', { name: /quick actions/i });

    expect(currentSpotCard).toBeInTheDocument();
    expect(quickActions).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change location/i })).toBeInTheDocument();
    expect(
      within(currentSpotCard).getByRole('button', { name: /view details/i }),
    ).toBeInTheDocument();
    expect(
      within(quickActions).getByRole('button', { name: /recent locations/i }),
    ).toBeInTheDocument();
    expect(
      within(quickActions).getByRole('button', { name: /station settings/i }),
    ).toBeInTheDocument();
  });

  it('shows the enabled field summary directly on the current spot card', () => {
    render(<App />);

    const currentSpotCard = screen.getByRole('region', { name: /current spot/i });
    expect(within(currentSpotCard).getByText(/right · bottom · medium/i)).toBeInTheDocument();
  });

  it('auto-dismisses the status notice after a delay', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    try {
      render(<App />);

      await user.click(screen.getByRole('button', { name: /change location/i }));
      await user.click(screen.getByRole('button', { name: /^lane 5$/i }));
      await user.click(screen.getByRole('button', { name: /save location/i }));

      expect(screen.getByText(/location updated/i)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4100);
      });

      expect(screen.queryByText(/location updated/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses station settings to drive the location editor fields', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /station settings/i }));

    await user.clear(screen.getByLabelText(/lane label 1/i));
    await user.type(screen.getByLabelText(/lane label 1/i), '4');
    await user.clear(screen.getByLabelText(/lane label 2/i));
    await user.type(screen.getByLabelText(/lane label 2/i), '5');
    await user.clear(screen.getByLabelText(/lane label 3/i));
    await user.type(screen.getByLabelText(/lane label 3/i), '6');
    await user.click(screen.getByRole('checkbox', { name: /side/i }));
    await user.click(screen.getByRole('button', { name: /save station settings/i }));

    await user.click(screen.getByRole('button', { name: /change location/i }));

    expect(screen.getByRole('button', { name: /^lane 4$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^lane 5$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^lane 6$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /side left/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /distance close/i })).not.toBeInTheDocument();
  });

  it('keeps GPS under More details for station mode but shows it by default outside', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /change location/i }));

    // Station mode: GPS capture lives in the collapsed More details panel.
    expect(screen.queryByRole('button', { name: /use my location/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /more details/i }));
    expect(screen.getByRole('button', { name: /use my location/i })).toBeInTheDocument();

    // Outside mode: GPS capture is shown by default.
    await user.click(screen.getByRole('button', { name: /parked outside/i }));
    expect(screen.getByRole('button', { name: /use my location/i })).toBeInTheDocument();
  });

  it('saves an outside location and shows its notes and photo in details', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /change location/i }));
    await user.click(screen.getByRole('button', { name: /parked outside instead/i }));
    await user.upload(
      screen.getByLabelText(/photo/i),
      new File(['outside'], 'outside.png', { type: 'image/png' }),
    );
    await user.type(screen.getByLabelText(/notes/i), 'At the fence near the station exit');
    await user.click(screen.getByRole('button', { name: /save location/i }));

    expect(screen.getByText(/outside the station/i)).toBeInTheDocument();
    expect(screen.getByText(/at the fence near the station exit/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view details/i }));

    const detailsSheet = screen.getByRole('dialog', {
      name: /location details/i,
    });
    expect(
      within(detailsSheet).getByText(/at the fence near the station exit/i),
    ).toBeInTheDocument();
    expect(await within(detailsSheet).findByAltText(/saved bike reference/i)).toBeInTheDocument();
  });

  it('opens recent locations in a preview flow and only promotes after confirmation', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /change location/i }));
    await user.click(screen.getByRole('button', { name: /^lane 5$/i }));
    await user.click(screen.getByRole('button', { name: /save location/i }));

    await user.click(screen.getByRole('button', { name: /recent locations/i }));
    await user.click(
      screen.getByRole('button', {
        name: /restore lane 4 from recent locations/i,
      }),
    );

    expect(screen.getByRole('dialog', { name: /recent location preview/i })).toBeInTheDocument();
    expect(window.location.hash).toBe('');

    await user.click(screen.getByRole('button', { name: /use this location/i }));

    expect(screen.getByText(/lane 4/i)).toBeInTheDocument();
  });

  it('keeps the saved visible fields on recent entries after station settings change', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /station settings/i }));
    await user.click(screen.getByRole('checkbox', { name: /side/i }));
    await user.click(screen.getByRole('button', { name: /save station settings/i }));

    await user.click(screen.getByRole('button', { name: /change location/i }));
    await user.click(screen.getByRole('button', { name: /^lane 5$/i }));
    await user.click(screen.getByRole('button', { name: /side left/i }));
    await user.click(screen.getByRole('button', { name: /save location/i }));

    await user.click(screen.getByRole('button', { name: /station settings/i }));
    await user.click(screen.getByRole('checkbox', { name: /side/i }));
    await user.click(screen.getByRole('checkbox', { name: /floor/i }));
    await user.type(screen.getByLabelText(/default floor/i), 'Upper deck');
    await user.click(screen.getByRole('button', { name: /save station settings/i }));

    await user.click(screen.getByRole('button', { name: /recent locations/i }));
    await user.click(
      screen.getByRole('button', {
        name: /restore lane 4 from recent locations/i,
      }),
    );

    const previewSheet = screen.getByRole('dialog', { name: /recent location preview/i });
    expect(within(previewSheet).getByText(/^side$/i)).toBeInTheDocument();
    expect(within(previewSheet).getAllByText(/^right$/i).length).toBeGreaterThan(0);
    expect(within(previewSheet).queryByText(/upper deck/i)).not.toBeInTheDocument();
  });

  it('closes sheets when the user clicks the dialog backdrop', async () => {
    const user = userEvent.setup();

    render(<App />);
    const currentSpotCard = screen.getByRole('region', { name: /current spot/i });

    await user.click(screen.getByRole('button', { name: /change location/i }));
    await user.click(screen.getByRole('dialog', { name: /change location/i }));
    expect(screen.queryByRole('heading', { name: /change location/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /recent locations/i }));
    await user.click(screen.getByRole('dialog', { name: /recent locations/i }));
    expect(screen.queryByRole('heading', { name: /recent locations/i })).not.toBeInTheDocument();

    await user.click(within(currentSpotCard).getByRole('button', { name: /view details/i }));
    await user.click(screen.getByRole('dialog', { name: /location details/i }));
    expect(screen.queryByRole('heading', { name: /location details/i })).not.toBeInTheDocument();
  });
});
