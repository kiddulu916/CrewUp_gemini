import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentFilter } from '@/components/admin/segment-filter';

describe('SegmentFilter', () => {
  it('renders all filter options', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{}} onChange={onChange} />);

    expect(screen.getByText('User Role')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it('calls onChange when role filter is selected', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{}} onChange={onChange} />);

    const roleSelect = screen.getByLabelText('User Role');
    fireEvent.change(roleSelect, { target: { value: 'worker' } });

    expect(onChange).toHaveBeenCalledWith({ role: 'worker' });
  });

  it('calls onChange when subscription filter is changed', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{}} onChange={onChange} />);

    const subscriptionSelect = screen.getByLabelText('Subscription');
    fireEvent.change(subscriptionSelect, { target: { value: 'pro' } });

    expect(onChange).toHaveBeenCalledWith({ subscription: 'pro' });
  });

  it('calls onChange when location text input is changed', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{}} onChange={onChange} />);

    const locationInput = screen.getByLabelText('Location');
    fireEvent.change(locationInput, { target: { value: 'New York' } });

    expect(onChange).toHaveBeenCalledWith({ location: 'New York' });
  });

  it('calls onChange when employer type filter is changed', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{}} onChange={onChange} />);

    const employerTypeSelect = screen.getByLabelText('Employer Type');
    fireEvent.change(employerTypeSelect, { target: { value: 'general_contractor' } });

    expect(onChange).toHaveBeenCalledWith({ employerType: 'general_contractor' });
  });

  it('clears all filters when Clear all button is clicked', () => {
    const onChange = vi.fn();
    render(
      <SegmentFilter
        value={{ role: 'worker', subscription: 'pro', location: 'Boston' }}
        onChange={onChange}
      />
    );

    const clearButton = screen.getByText('Clear all');
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith({});
  });

  it('hides Clear all button when no filters are active', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{}} onChange={onChange} />);

    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });

  it('shows Clear all button when filters are active', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{ role: 'worker' }} onChange={onChange} />);

    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('preserves other filters when changing one filter', () => {
    const onChange = vi.fn();
    render(
      <SegmentFilter
        value={{ role: 'worker', subscription: 'free' }}
        onChange={onChange}
      />
    );

    const locationInput = screen.getByLabelText('Location');
    fireEvent.change(locationInput, { target: { value: 'Chicago' } });

    expect(onChange).toHaveBeenCalledWith({
      role: 'worker',
      subscription: 'free',
      location: 'Chicago'
    });
  });

  it('renders with pre-populated values', () => {
    const onChange = vi.fn();
    render(
      <SegmentFilter
        value={{
          role: 'employer',
          subscription: 'pro',
          location: 'San Francisco',
          employerType: 'subcontractor'
        }}
        onChange={onChange}
      />
    );

    expect(screen.getByLabelText('User Role')).toHaveValue('employer');
    expect(screen.getByLabelText('Subscription')).toHaveValue('pro');
    expect(screen.getByLabelText('Location')).toHaveValue('San Francisco');
    expect(screen.getByLabelText('Employer Type')).toHaveValue('subcontractor');
  });
});
