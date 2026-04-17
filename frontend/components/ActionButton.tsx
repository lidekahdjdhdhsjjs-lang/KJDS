'use client';

import { colors, borderRadius, spacing } from '@/lib/design-system';

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'success' | 'danger' | 'neutral';
}

const toneStyles = {
  primary: { backgroundColor: colors.primary, color: colors.surface, border: `1px solid ${colors.primary}` },
  success: { backgroundColor: colors.success, color: colors.surface, border: `1px solid ${colors.success}` },
  danger: { backgroundColor: colors.error, color: colors.surface, border: `1px solid ${colors.error}` },
  neutral: { backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` },
};

export function ActionButton({ label, onClick, disabled = false, tone = 'primary' }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...toneStyles[tone],
        borderRadius: borderRadius.base,
        padding: `${spacing[2]}px ${spacing[3]}px`,
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
