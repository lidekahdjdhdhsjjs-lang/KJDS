'use client';

import { useState, useCallback } from 'react';
import { colors, borderRadius, spacing } from '@/lib/design-system';

// Form validation types
export type ValidationRule<T> = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
};

export type ValidationRules<T extends Record<string, unknown>> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

export type ValidationErrors<T extends Record<string, unknown>> = {
  [K in keyof T]?: string;
};

// Validation function
export function validateField<T>(value: T, rules: ValidationRule<T>): string | null {
  if (rules.required) {
    if (value === null || value === undefined || value === '') return 'This field is required';
    if (Array.isArray(value) && value.length === 0) return 'At least one item is required';
  }
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string') {
    if (rules.minLength !== undefined && value.length < rules.minLength) return `Must be at least ${rules.minLength} characters`;
    if (rules.maxLength !== undefined && value.length > rules.maxLength) return `Must be no more than ${rules.maxLength} characters`;
    if (rules.pattern && !rules.pattern.test(value)) return 'Invalid format';
  }

  if (typeof value === 'number') {
    if (rules.minLength !== undefined && value < rules.minLength) return `Must be at least ${rules.minLength}`;
    if (rules.maxLength !== undefined && value > rules.maxLength) return `Must be no more than ${rules.maxLength}`;
  }

  if (rules.custom) return rules.custom(value);
  return null;
}

export function validateForm<T extends Record<string, unknown>>(
  values: T, rules: ValidationRules<T>
): { isValid: boolean; errors: ValidationErrors<T> } {
  const errors: ValidationErrors<T> = {};
  let isValid = true;
  for (const key in rules) {
    const fieldRules = rules[key];
    if (fieldRules) {
      const error = validateField(values[key], fieldRules);
      if (error) { errors[key] = error; isValid = false; }
    }
  }
  return { isValid, errors };
}

export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T, validationRules: ValidationRules<T>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [touched, setTouched] = useState<Set<keyof T>>(new Set());

  const handleChange = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (touched.has(field)) {
      const rules = validationRules[field];
      if (rules) {
        const error = validateField(value, rules);
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (error) newErrors[field] = error; else delete newErrors[field];
          return newErrors;
        });
      }
    }
  }, [touched, validationRules]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched((prev) => new Set(prev).add(field));
    const rules = validationRules[field];
    if (rules) {
      const error = validateField(values[field], rules);
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (error) newErrors[field] = error; else delete newErrors[field];
        return newErrors;
      });
    }
  }, [values, validationRules]);

  const validate = useCallback((): boolean => {
    const { isValid, errors: newErrors } = validateForm(values, validationRules);
    setErrors(newErrors);
    setTouched(new Set(Object.keys(validationRules) as (keyof T)[]));
    return isValid;
  }, [values, validationRules]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched(new Set());
  }, [initialValues]);

  return { values, errors, touched, handleChange, handleBlur, validate, reset, setValues };
}

export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/[^\s]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^[0-9]+$/,
  price: /^\d+(\.\d{1,2})?$/,
  id: /^[a-zA-Z0-9_-]+$/,
};

function fieldLabel(label: string, required?: boolean) {
  return (
    <label style={{ display: 'block', marginBottom: spacing[1], fontSize: 14, fontWeight: 600, color: colors.text }}>
      {label}
      {required && <span style={{ color: colors.error, marginLeft: spacing[1] }}>*</span>}
    </label>
  );
}

function fieldError(error?: string) {
  if (!error) return null;
  return <p style={{ margin: `${spacing[1]} 0 0`, fontSize: 12, color: colors.error }}>{error}</p>;
}

export function ValidatedInput({ label, value, onChange, onBlur, error, type = 'text', placeholder, disabled, required }: {
  label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; error?: string;
  type?: 'text' | 'number' | 'email' | 'password'; placeholder?: string; disabled?: boolean; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: spacing[4] }}>
      {fieldLabel(label, required)}
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        placeholder={placeholder} disabled={disabled}
        style={{
          width: '100%', padding: `${spacing[2] + 2}px ${spacing[3]}px`, borderRadius: borderRadius.base,
          border: error ? `1px solid ${colors.error}` : `1px solid ${colors.borderDark}`,
          fontSize: 14, outline: 'none', transition: 'border-color 0.15s ease-in-out',
          backgroundColor: disabled ? colors.background : colors.surface,
        }}
        onFocus={(e) => { e.target.style.borderColor = colors.primary; }}
      />
      {fieldError(error)}
    </div>
  );
}

export function ValidatedSelect<T extends string>({ label, value, onChange, onBlur, error, options, disabled, required }: {
  label: string; value: T; onChange: (value: T) => void; onBlur?: () => void; error?: string;
  options: { value: T; label: string }[]; disabled?: boolean; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: spacing[4] }}>
      {fieldLabel(label, required)}
      <select
        value={value} onChange={(e) => onChange(e.target.value as T)} onBlur={onBlur} disabled={disabled}
        style={{
          width: '100%', padding: `${spacing[2] + 2}px ${spacing[3]}px`, borderRadius: borderRadius.base,
          border: error ? `1px solid ${colors.error}` : `1px solid ${colors.borderDark}`,
          fontSize: 14, outline: 'none', backgroundColor: disabled ? colors.background : colors.surface,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {fieldError(error)}
    </div>
  );
}

export function ValidatedTextarea({ label, value, onChange, onBlur, error, placeholder, rows = 3, disabled, required }: {
  label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; error?: string;
  placeholder?: string; rows?: number; disabled?: boolean; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: spacing[4] }}>
      {fieldLabel(label, required)}
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        placeholder={placeholder} rows={rows} disabled={disabled}
        style={{
          width: '100%', padding: `${spacing[2] + 2}px ${spacing[3]}px`, borderRadius: borderRadius.base,
          border: error ? `1px solid ${colors.error}` : `1px solid ${colors.borderDark}`,
          fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
          backgroundColor: disabled ? colors.background : colors.surface,
        }}
      />
      {fieldError(error)}
    </div>
  );
}
