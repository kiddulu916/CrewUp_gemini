import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  it('should render with default props', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('should render with placeholder', () => {
    render(<Input placeholder="Enter your name" />);
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('should accept and display user input', async () => {
    const user = userEvent.setup();
    render(<Input />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    await user.type(input, 'Hello World');
    expect(input.value).toBe('Hello World');
  });

  it('should call onChange handler when value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('should render with type attribute', () => {
    render(<Input type="email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should render password input', () => {
    const { container } = render(<Input type="password" />);
    const input = container.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('should accept defaultValue', () => {
    render(<Input defaultValue="Initial value" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('Initial value');
  });

  it('should be required when required prop is true', () => {
    render(<Input required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });

  it('should accept maxLength attribute', () => {
    render(<Input maxLength={10} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '10');
  });

  it('should accept name attribute', () => {
    render(<Input name="username" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('name', 'username');
  });

  it('should accept id attribute', () => {
    render(<Input id="email-input" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'email-input');
  });

  it('should handle onBlur event', async () => {
    const handleBlur = vi.fn();
    const user = userEvent.setup();
    render(<Input onBlur={handleBlur} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.tab(); // Blur the input

    expect(handleBlur).toHaveBeenCalled();
  });

  it('should handle onFocus event', async () => {
    const handleFocus = vi.fn();
    const user = userEvent.setup();
    render(<Input onFocus={handleFocus} />);

    const input = screen.getByRole('textbox');
    await user.click(input);

    expect(handleFocus).toHaveBeenCalled();
  });

  it('should be read-only when readOnly prop is true', () => {
    render(<Input readOnly value="Cannot edit" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readOnly');
  });
});
