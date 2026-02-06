// PaymentMethodCard Component Tests
// Created: 2026-02-05
// Purpose: Test payment method card component

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentMethodCard } from './PaymentMethodCard';
import { PaymentMethodInfo } from '../../../api/types';

const mockPaymentMethods: PaymentMethodInfo[] = [
  {
    id: '1',
    type: 'credit_card',
    last4: '4242',
    brand: 'Visa',
    expiryMonth: 12,
    expiryYear: 2027,
    isDefault: true,
    createdAt: new Date('2025-06-15'),
  },
  {
    id: '2',
    type: 'credit_card',
    last4: '5555',
    brand: 'Mastercard',
    expiryMonth: 6,
    expiryYear: 2026,
    isDefault: false,
    createdAt: new Date('2025-08-20'),
  },
];

describe('PaymentMethodCard', () => {
  const mockOnAddPaymentMethod = jest.fn();
  const mockOnRemovePaymentMethod = jest.fn();
  const mockOnSetDefault = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with payment method data', () => {
      render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      expect(screen.getByText('Payment Methods')).toBeInTheDocument();
    });

    it('shows loading skeleton when loading', () => {
      render(<PaymentMethodCard paymentMethods={[]} loading={true} />);

      const skeleton = screen.getByRole('generic', { hidden: true });
      expect(skeleton.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows no data state when paymentMethods array is empty', () => {
      render(<PaymentMethodCard paymentMethods={[]} />);

      expect(screen.getByText('No payment methods added')).toBeInTheDocument();
    });

    it('displays all payment methods', () => {
      render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      expect(screen.getByText(/visa ending in 4242/i)).toBeInTheDocument();
      expect(screen.getByText(/mastercard ending in 5555/i)).toBeInTheDocument();
    });
  });

  describe('Add Payment Method Button', () => {
    it('shows add button in header when onAddPaymentMethod provided', () => {
      render(<PaymentMethodCard paymentMethods={[]} onAddPaymentMethod={mockOnAddPaymentMethod} />);

      expect(screen.getByRole('button', { name: /add payment method/i })).toBeInTheDocument();
    });

    it('does not show add button when onAddPaymentMethod not provided', () => {
      render(<PaymentMethodCard paymentMethods={[]} />);

      expect(screen.queryByRole('button', { name: /add payment method/i })).not.toBeInTheDocument();
    });

    it('calls onAddPaymentMethod when add button clicked', () => {
      render(<PaymentMethodCard paymentMethods={[]} onAddPaymentMethod={mockOnAddPaymentMethod} />);

      const addButton = screen.getByRole('button', { name: /add payment method/i });
      fireEvent.click(addButton);

      expect(mockOnAddPaymentMethod).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('shows call-to-action button when empty and onAddPaymentMethod provided', () => {
      render(<PaymentMethodCard paymentMethods={[]} onAddPaymentMethod={mockOnAddPaymentMethod} />);

      const ctaButton = screen.getByRole('button', { name: /add your first payment method/i });
      expect(ctaButton).toBeInTheDocument();

      fireEvent.click(ctaButton);
      expect(mockOnAddPaymentMethod).toHaveBeenCalledTimes(1);
    });

    it('does not show CTA button when onAddPaymentMethod not provided', () => {
      render(<PaymentMethodCard paymentMethods={[]} />);

      expect(screen.queryByRole('button', { name: /add your first payment method/i })).not.toBeInTheDocument();
    });
  });

  describe('Payment Method Display', () => {
    it('displays credit card with brand and last 4', () => {
      render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      expect(screen.getByText(/Visa ending in 4242/)).toBeInTheDocument();
      expect(screen.getByText(/Mastercard ending in 5555/)).toBeInTheDocument();
    });

    it('displays expiry date', () => {
      render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      expect(screen.getByText('Expires 12/27')).toBeInTheDocument();
      expect(screen.getByText('Expires 06/26')).toBeInTheDocument();
    });

    it('displays added date', () => {
      render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      expect(screen.getByText(/Added 6\/15\/2025/)).toBeInTheDocument();
      expect(screen.getByText(/Added 8\/20\/2025/)).toBeInTheDocument();
    });

    it('shows default badge for default payment method', () => {
      render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      const defaultBadges = screen.getAllByText('Default');
      expect(defaultBadges).toHaveLength(1);
    });
  });

  describe('Payment Method Types', () => {
    it('displays Visa icon for Visa cards', () => {
      render(<PaymentMethodCard paymentMethods={[mockPaymentMethods[0]]} />);

      expect(screen.getByText('VISA')).toBeInTheDocument();
    });

    it('displays Mastercard icon for Mastercard cards', () => {
      const { container } = render(<PaymentMethodCard paymentMethods={[mockPaymentMethods[1]]} />);

      // Mastercard icon has two colored circles
      const mastercardIcon = container.querySelector('.bg-red-600');
      expect(mastercardIcon).toBeInTheDocument();
    });

    it('displays PayPal badge for PayPal payment methods', () => {
      const paypalMethod: PaymentMethodInfo = {
        id: '3',
        type: 'paypal',
        isDefault: false,
        createdAt: new Date('2025-09-01'),
      };

      render(<PaymentMethodCard paymentMethods={[paypalMethod]} />);

      expect(screen.getByText('PP')).toBeInTheDocument();
      expect(screen.getByText('PayPal')).toBeInTheDocument();
    });

    it('displays bank icon for bank transfer', () => {
      const bankMethod: PaymentMethodInfo = {
        id: '4',
        type: 'bank_transfer',
        isDefault: false,
        createdAt: new Date('2025-09-01'),
      };

      render(<PaymentMethodCard paymentMethods={[bankMethod]} />);

      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    });
  });

  describe('Default Payment Method Highlighting', () => {
    it('highlights default payment method with blue border', () => {
      const { container } = render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      const defaultCard = screen.getByText(/Visa ending in 4242/).closest('div.p-4')!;
      expect(defaultCard).toHaveClass('border-blue-500');
      expect(defaultCard).toHaveClass('bg-blue-50');
    });

    it('non-default payment methods have gray border', () => {
      const { container } = render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      const nonDefaultCard = screen.getByText(/Mastercard ending in 5555/).closest('div.p-4')!;
      expect(nonDefaultCard).toHaveClass('border-gray-200');
      expect(nonDefaultCard).toHaveClass('bg-white');
    });
  });

  describe('Set Default Action', () => {
    it('shows set default button for non-default payment methods', () => {
      render(
        <PaymentMethodCard
          paymentMethods={mockPaymentMethods}
          onSetDefault={mockOnSetDefault}
        />
      );

      const setDefaultButtons = screen.getAllByRole('button', { name: /set default/i });
      expect(setDefaultButtons).toHaveLength(1); // Only for non-default card
    });

    it('does not show set default button for default payment method', () => {
      const defaultOnly = [mockPaymentMethods[0]];
      render(
        <PaymentMethodCard
          paymentMethods={defaultOnly}
          onSetDefault={mockOnSetDefault}
        />
      );

      expect(screen.queryByRole('button', { name: /set default/i })).not.toBeInTheDocument();
    });

    it('calls onSetDefault when set default button clicked', () => {
      render(
        <PaymentMethodCard
          paymentMethods={mockPaymentMethods}
          onSetDefault={mockOnSetDefault}
        />
      );

      const setDefaultButton = screen.getByRole('button', { name: /set default/i });
      fireEvent.click(setDefaultButton);

      expect(mockOnSetDefault).toHaveBeenCalledTimes(1);
      expect(mockOnSetDefault).toHaveBeenCalledWith('2'); // Second payment method ID
    });

    it('does not show set default button when onSetDefault not provided', () => {
      render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      expect(screen.queryByRole('button', { name: /set default/i })).not.toBeInTheDocument();
    });
  });

  describe('Remove Action', () => {
    it('shows remove button for non-default payment methods', () => {
      render(
        <PaymentMethodCard
          paymentMethods={mockPaymentMethods}
          onRemovePaymentMethod={mockOnRemovePaymentMethod}
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      expect(removeButtons).toHaveLength(1); // Only for non-default card
    });

    it('does not show remove button for default payment method', () => {
      const defaultOnly = [mockPaymentMethods[0]];
      render(
        <PaymentMethodCard
          paymentMethods={defaultOnly}
          onRemovePaymentMethod={mockOnRemovePaymentMethod}
        />
      );

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    it('calls onRemovePaymentMethod when remove button clicked', () => {
      render(
        <PaymentMethodCard
          paymentMethods={mockPaymentMethods}
          onRemovePaymentMethod={mockOnRemovePaymentMethod}
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      expect(mockOnRemovePaymentMethod).toHaveBeenCalledTimes(1);
      expect(mockOnRemovePaymentMethod).toHaveBeenCalledWith('2');
    });

    it('does not show remove button when onRemovePaymentMethod not provided', () => {
      render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });
  });

  describe('Info Note', () => {
    it('shows info note when payment methods exist', () => {
      render(<PaymentMethodCard paymentMethods={mockPaymentMethods} />);

      expect(screen.getByText(/your default payment method will be used/i)).toBeInTheDocument();
    });

    it('does not show info note when no payment methods', () => {
      render(<PaymentMethodCard paymentMethods={[]} />);

      expect(screen.queryByText(/your default payment method will be used/i)).not.toBeInTheDocument();
    });
  });

  describe('Custom Class Name', () => {
    it('applies custom className', () => {
      const { container } = render(
        <PaymentMethodCard paymentMethods={mockPaymentMethods} className="custom-class" />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles payment method without expiry date', () => {
      const noExpiryMethod: PaymentMethodInfo = {
        id: '5',
        type: 'credit_card',
        last4: '1234',
        brand: 'Visa',
        isDefault: false,
        createdAt: new Date('2025-10-01'),
      };

      render(<PaymentMethodCard paymentMethods={[noExpiryMethod]} />);

      expect(screen.queryByText(/Expires/)).not.toBeInTheDocument();
    });

    it('handles payment method without brand', () => {
      const noBrandMethod: PaymentMethodInfo = {
        id: '6',
        type: 'credit_card',
        last4: '9999',
        isDefault: false,
        createdAt: new Date('2025-11-01'),
        expiryMonth: 3,
        expiryYear: 2028,
      };

      render(<PaymentMethodCard paymentMethods={[noBrandMethod]} />);

      expect(screen.getByText(/Card ending in 9999/)).toBeInTheDocument();
    });
  });
});
