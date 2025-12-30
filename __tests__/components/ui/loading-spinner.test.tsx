import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSpinner, PageLoadingSpinner, InlineSpinner } from '@/components/ui/loading-spinner';

describe('LoadingSpinner Component', () => {
  it('should render with default size', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  it('should render with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-4');
    expect(spinner).toHaveClass('w-4');
  });

  it('should render with medium size', () => {
    const { container } = render(<LoadingSpinner size="md" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-8');
    expect(spinner).toHaveClass('w-8');
  });

  it('should render with large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-12');
    expect(spinner).toHaveClass('w-12');
  });

  it('should render with extra large size', () => {
    const { container } = render(<LoadingSpinner size="xl" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-16');
    expect(spinner).toHaveClass('w-16');
  });

  it('should have accessibility attributes', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('should render with custom label', () => {
    const { container } = render(<LoadingSpinner label="Please wait..." />);
    expect(container.textContent).toContain('Please wait...');
  });

  it('should be centered', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('justify-center');
    expect(wrapper).toHaveClass('items-center');
  });

  it('should accept custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-spinner" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('custom-spinner');
  });

  it('should animate', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should have rounded full styling', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('rounded-full');
  });

  it('should have border styling', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('border-krewup-blue');
    expect(spinner).toHaveClass('border-t-transparent');
  });
});

describe('PageLoadingSpinner Component', () => {
  it('should render full-page spinner', () => {
    const { container } = render(<PageLoadingSpinner />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('min-h-screen');
  });

  it('should render with custom label', () => {
    const { container } = render(<PageLoadingSpinner label="Loading page..." />);
    expect(container.textContent).toContain('Loading page...');
  });

  it('should use xl size by default', () => {
    const { container } = render(<PageLoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-16');
    expect(spinner).toHaveClass('w-16');
  });
});

describe('InlineSpinner Component', () => {
  it('should render inline spinner', () => {
    const { container } = render(<InlineSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  it('should be small size', () => {
    const { container } = render(<InlineSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-4');
    expect(spinner).toHaveClass('w-4');
  });

  it('should accept custom className', () => {
    const { container } = render(<InlineSpinner className="custom-inline" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('custom-inline');
  });

  it('should have white border by default', () => {
    const { container } = render(<InlineSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('border-white');
  });
});
