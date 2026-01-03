import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscriptionBadge } from '@/components/common/subscription-badge';
import { Profile } from '@/lib/types/profile.types';

const createMockProfile = (
  overrides: Partial<Profile> = {}
): Profile => ({
  id: '123',
  name: 'Test User',
  role: 'worker',
  subscription_status: 'free',
  trade: 'Electrical',
  location: 'New York, NY',
  email: 'test@example.com',
  is_profile_boosted: false,
  authorized_to_work: true,
  has_drivers_license: false,
  has_reliable_transportation: false,
  years_of_experience: 0,
  trade_skills: [],
  has_tools: false,
  tools_owned: [],
  is_lifetime_pro: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

describe('SubscriptionBadge', () => {
  it('renders nothing when profile is null', () => {
    const { container } = render(<SubscriptionBadge profile={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "Free" badge for free users', () => {
    const profile = createMockProfile({
      subscription_status: 'free',
      is_lifetime_pro: false,
    });

    render(<SubscriptionBadge profile={profile} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('renders "Pro" badge for pro users', () => {
    const profile = createMockProfile({
      subscription_status: 'pro',
      is_lifetime_pro: false,
    });

    render(<SubscriptionBadge profile={profile} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('renders "Founding Member" badge for lifetime pro users', () => {
    const profile = createMockProfile({
      subscription_status: 'free',
      is_lifetime_pro: true,
    });

    render(<SubscriptionBadge profile={profile} />);
    expect(screen.getByText('Founding Member')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const profile = createMockProfile({
      subscription_status: 'pro',
    });

    const { container } = render(
      <SubscriptionBadge profile={profile} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders different sizes correctly', () => {
    const profile = createMockProfile({
      subscription_status: 'pro',
    });

    const { rerender } = render(
      <SubscriptionBadge profile={profile} size="sm" />
    );
    expect(screen.getByText('Pro').parentElement).toHaveClass('text-xs');

    rerender(<SubscriptionBadge profile={profile} size="md" />);
    expect(screen.getByText('Pro').parentElement).toHaveClass('text-sm');

    rerender(<SubscriptionBadge profile={profile} size="lg" />);
    expect(screen.getByText('Pro').parentElement).toHaveClass('text-base');
  });

  it('renders star icon only for lifetime pro users', () => {
    const lifetimeProfile = createMockProfile({
      is_lifetime_pro: true,
    });

    const { container: lifetimeContainer } = render(
      <SubscriptionBadge profile={lifetimeProfile} />
    );
    expect(lifetimeContainer.querySelector('svg')).toBeInTheDocument();

    const proProfile = createMockProfile({
      subscription_status: 'pro',
      is_lifetime_pro: false,
    });

    const { container: proContainer } = render(
      <SubscriptionBadge profile={proProfile} />
    );
    expect(proContainer.querySelector('svg')).not.toBeInTheDocument();
  });
});
