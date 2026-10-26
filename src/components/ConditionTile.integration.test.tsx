import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import { ConditionTile } from './ConditionTile';

describe('ConditionTile integration', () => {
  it('Use Case: renders the label, value, and detail of a condition', () => {
    renderWithProviders(
      <ConditionTile kind="pressure" label="Pressure" value="1012.4 mb" meta="-0.8/3h ↓" tone="negative" />
    );

    expect(screen.getByText('Pressure')).toBeInTheDocument();
    expect(screen.getByText('1012.4 mb')).toBeInTheDocument();
    expect(screen.getByText('-0.8/3h ↓')).toBeInTheDocument();
  });

  it('Use Case: falls back to the label registered for the metric', () => {
    renderWithProviders(<ConditionTile kind="dewpoint" value="70°F" />);

    expect(screen.getByText('Dewpoint')).toBeInTheDocument();
    expect(screen.getByText('70°F')).toBeInTheDocument();
  });

  it('Use Case: omits the detail line when no detail is supplied', () => {
    const { container } = renderWithProviders(
      <ConditionTile kind="temperature" value="84°F" />
    );

    expect(screen.queryByText('RH 64%')).not.toBeInTheDocument();
    expect(container.querySelector('.condition-tile-meta')).toBeNull();
  });

  it('Use Case: marks the detail line with the requested tone', () => {
    renderWithProviders(
      <ConditionTile kind="pressure" value="1012.4 mb" meta="-0.8/3h ↓" tone="negative" />
    );

    const meta = screen.getByText('-0.8/3h ↓');
    expect(meta).toHaveClass('condition-tile-meta');
    expect(meta).toHaveClass('negative');
  });

  it('Use Case: renders a borderless tile in the bare variant', () => {
    const { container } = renderWithProviders(
      <ConditionTile kind="wind" value="↘ SE 9 kt" variant="bare" />
    );

    expect(container.querySelector('.condition-tile')).toHaveClass('condition-tile--bare');
  });

  it('Use Case: identifies the metric it renders', () => {
    const { container } = renderWithProviders(
      <ConditionTile kind="feels-like" value="87°F" />
    );

    expect(container.querySelector('.condition-tile')).toHaveAttribute(
      'data-kind',
      'feels-like'
    );
  });
});
