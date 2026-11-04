import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../tests/utils/render';
import ForecastField from './ForecastField';

describe('ForecastField', () => {
  it('renders the field and its official/model values', () => {
    renderWithProviders(
      <ForecastField
        field="high"
        value="25"
        officialValue="24°C"
        modelValue="26°C"
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole('spinbutton', { name: 'High' })).toHaveValue(25);
    expect(screen.getByRole('status', { name: 'High official' })).toHaveTextContent('24°C');
    expect(screen.getByRole('status', { name: 'High model' })).toHaveTextContent('26°C');
  });

  it('renders a select for sky and reports changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ForecastField field="sky" value="" onChange={onChange} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sky' }), 'Rain');

    expect(onChange).toHaveBeenCalledWith('Rain');
  });
});
