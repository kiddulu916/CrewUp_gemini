import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge Component', () => {
  it('should render with text content', () => {
    render(<Badge>Pro</Badge>);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('should render with default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gradient-to-r');
  });

  it('should render with success variant', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('from-green-400');
    expect(badge).toHaveClass('to-emerald-500');
  });

  it('should render with warning variant', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('from-yellow-400');
    expect(badge).toHaveClass('to-orange-400');
  });

  it('should render with danger variant', () => {
    const { container } = render(<Badge variant="danger">Danger</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('from-red-400');
    expect(badge).toHaveClass('to-red-600');
  });

  it('should render with info variant', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('from-krewup-blue');
    expect(badge).toHaveClass('to-krewup-light-blue');
  });

  it('should render with pro variant', () => {
    const { container } = render(<Badge variant="pro">Pro</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('from-krewup-blue');
    expect(badge).toHaveClass('to-krewup-orange');
    expect(badge).toHaveClass('animate-pulse');
  });

  it('should accept custom className', () => {
    const { container } = render(<Badge className="custom-badge">Text</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('custom-badge');
  });

  it('should render inline by default', () => {
    const { container } = render(<Badge>Inline</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveClass('inline-flex');
  });

  it('should be small and compact', () => {
    const { container } = render(<Badge>Small</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('px-2.5');
    expect(badge).toHaveClass('py-0.5');
    expect(badge).toHaveClass('text-xs');
  });

  it('should have rounded corners', () => {
    const { container } = render(<Badge>Rounded</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('rounded-full');
  });

  it('should render with children nodes', () => {
    render(
      <Badge>
        <span>Icon</span> Text
      </Badge>
    );
    expect(screen.getByText('Icon')).toBeInTheDocument();
    expect(screen.getByText(/Text/)).toBeInTheDocument();
  });

  it('should handle empty content', () => {
    const { container } = render(<Badge></Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('');
  });

  it('should have font styling', () => {
    const { container } = render(<Badge>Text</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('font-semibold');
  });

  it('should have transition classes', () => {
    const { container } = render(<Badge>Text</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('transition-colors');
  });
});
