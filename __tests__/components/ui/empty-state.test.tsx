import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/ui/empty-state';

describe('EmptyState Component', () => {
  it('should render with title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render with description', () => {
    render(
      <EmptyState
        title="No jobs"
        description="There are no jobs matching your criteria"
      />
    );
    expect(
      screen.getByText('There are no jobs matching your criteria')
    ).toBeInTheDocument();
  });

  it('should render with action button', () => {
    render(
      <EmptyState
        title="No jobs"
        action={{ label: 'Post a Job', onClick: () => {} }}
      />
    );
    expect(screen.getByText('Post a Job')).toBeInTheDocument();
  });

  it('should call action onClick when button clicked', () => {
    let clicked = false;
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Click me', onClick: () => (clicked = true) }}
      />
    );

    screen.getByText('Click me').click();
    expect(clicked).toBe(true);
  });

  it('should render with icon', () => {
    const { container } = render(
      <EmptyState
        title="No messages"
        icon={<svg data-testid="message-icon" />}
      />
    );
    expect(container.querySelector('[data-testid="message-icon"]')).toBeInTheDocument();
  });

  it('should render centered by default', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('text-center');
  });

  it('should render without action button when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render all elements together', () => {
    render(
      <EmptyState
        title="No applications"
        description="You haven't applied to any jobs yet"
        icon={<svg data-testid="app-icon" />}
        action={{ label: 'Browse Jobs', onClick: () => {} }}
      />
    );

    expect(screen.getByText('No applications')).toBeInTheDocument();
    expect(
      screen.getByText("You haven't applied to any jobs yet")
    ).toBeInTheDocument();
    expect(screen.getByText('Browse Jobs')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(
      <EmptyState title="Empty" className="custom-empty" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-empty');
  });
});
