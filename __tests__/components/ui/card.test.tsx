import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/card';

describe('Card Component', () => {
  it('should render children content', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should render with default styling', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('rounded-xl');
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('shadow-md');
  });

  it('should accept custom className', () => {
    const { container } = render(<Card className="custom-card">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-card');
  });

  it('should render multiple children', () => {
    render(
      <Card>
        <h1>Title</h1>
        <p>Description</p>
        <button>Action</button>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('should accept data attributes', () => {
    const { container } = render(
      <Card data-testid="test-card">Content</Card>
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveAttribute('data-testid', 'test-card');
  });

  it('should render as a div element by default', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should merge custom styles with default styles', () => {
    const { container } = render(
      <Card className="bg-red-500 p-8">Content</Card>
    );
    const card = container.firstChild as HTMLElement;

    // Should have both custom and default classes
    expect(card).toHaveClass('bg-red-500');
    expect(card).toHaveClass('p-8');
    expect(card).toHaveClass('rounded-xl'); // Default class
  });

  it('should render elevated variant', () => {
    const { container } = render(<Card variant="elevated">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('shadow-xl');
    expect(card).toHaveClass('bg-white');
  });

  it('should render outlined variant', () => {
    const { container } = render(<Card variant="outlined">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('border-2');
    expect(card).toHaveClass('border-krewup-light-blue');
  });

  it('should render nested Cards', () => {
    render(
      <Card>
        <Card>
          <p>Nested card</p>
        </Card>
      </Card>
    );
    expect(screen.getByText('Nested card')).toBeInTheDocument();
  });

  it('should have hover effects on default variant', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('hover:shadow-xl');
    expect(card).toHaveClass('transition-shadow');
  });

  it('should support onClick via native div props', () => {
    let clicked = false;
    const { container } = render(
      <Card onClick={() => (clicked = true)}>Clickable Card</Card>
    );

    const card = container.firstChild as HTMLElement;
    card.click();

    expect(clicked).toBe(true);
  });
});
