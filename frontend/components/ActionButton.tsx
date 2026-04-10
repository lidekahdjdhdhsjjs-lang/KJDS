'use client';

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'success' | 'danger' | 'neutral';
}

const toneStyles = {
  primary: { backgroundColor: '#2563eb', color: '#fff', border: '1px solid #2563eb' },
  success: { backgroundColor: '#059669', color: '#fff', border: '1px solid #059669' },
  danger: { backgroundColor: '#dc2626', color: '#fff', border: '1px solid #dc2626' },
  neutral: { backgroundColor: '#fff', color: '#111827', border: '1px solid #d1d5db' },
};

export function ActionButton({ label, onClick, disabled = false, tone = 'primary' }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...toneStyles[tone],
        borderRadius: 8,
        padding: '8px 12px',
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
