import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  children?: ReactNode;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  return render(ui, options);
}
