import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navigation } from '@/components/Navigation';

describe('Navigation', () => {
  it('renders all nav items', () => {
    render(<Navigation />);
    expect(screen.getByText(/控制台/)).toBeInTheDocument();
    expect(screen.getByText(/一键运营/)).toBeInTheDocument();
    expect(screen.getByText(/商机管理/)).toBeInTheDocument();
    expect(screen.getByText(/异常中心/)).toBeInTheDocument();
    expect(screen.getByText(/采购单/)).toBeInTheDocument();
    expect(screen.getByText(/AI任务/)).toBeInTheDocument();
    expect(screen.getByText(/设置/)).toBeInTheDocument();
  });

  it('renders shopee brand', () => {
    render(<Navigation />);
    expect(screen.getByText('Shopee AI Ops')).toBeInTheDocument();
  });
});
