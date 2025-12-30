import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerificationBadge } from '@/components/common/verification-badge';

describe('VerificationBadge Component', () => {
  it('should render verified badge', () => {
    render(<VerificationBadge status="verified" />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('should render pending badge', () => {
    render(<VerificationBadge status="pending" />);
    expect(screen.getByText('Pending Verification')).toBeInTheDocument();
  });

  it('should render rejected badge', () => {
    render(<VerificationBadge status="rejected" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('should have correct variant for verified', () => {
    const { container } = render(<VerificationBadge status="verified" />);
    const badge = container.querySelector('.bg-green-100');
    expect(badge).toBeInTheDocument();
  });

  it('should have correct variant for pending', () => {
    const { container } = render(<VerificationBadge status="pending" />);
    const badge = container.querySelector('.bg-yellow-100');
    expect(badge).toBeInTheDocument();
  });

  it('should have correct variant for rejected', () => {
    const { container } = render(<VerificationBadge status="rejected" />);
    const badge = container.querySelector('.bg-red-100');
    expect(badge).toBeInTheDocument();
  });

  it('should render with small size', () => {
    const { container } = render(<VerificationBadge status="verified" size="sm" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('text-xs');
  });

  it('should render with medium size by default', () => {
    const { container } = render(<VerificationBadge status="verified" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('text-sm');
  });

  it('should show correct icon for each status', () => {
    const { container: verifiedContainer } = render(<VerificationBadge status="verified" />);
    expect(verifiedContainer.textContent).toContain('✓');

    const { container: pendingContainer } = render(<VerificationBadge status="pending" />);
    expect(pendingContainer.textContent).toContain('⏳');

    const { container: rejectedContainer } = render(<VerificationBadge status="rejected" />);
    expect(rejectedContainer.textContent).toContain('✗');
  });

  it('should accept custom className', () => {
    const { container } = render(
      <VerificationBadge status="verified" className="custom-badge" />
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('custom-badge');
  });

  it('should be inline-flex', () => {
    const { container } = render(<VerificationBadge status="verified" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('inline-flex');
  });

  it('should have rounded-full style', () => {
    const { container } = render(<VerificationBadge status="verified" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('rounded-full');
  });
});
