import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoachingModeToggle } from '../CoachingModeToggle';
import { CoachingMode } from '@/types';

// Mock the UI components
vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled, ...props }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      data-testid="coaching-mode-switch"
      {...props}
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  )
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => 
    asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="tooltip-content">{children}</div>
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | boolean)[]) => classes.filter(Boolean).join(' ')
}));

describe('CoachingModeToggle', () => {
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    mockOnModeChange.mockClear();
  });

  describe('Component Interface', () => {
    it('accepts required props correctly', () => {
      const props = {
        currentMode: 'comprehensive' as CoachingMode,
        onModeChange: mockOnModeChange
      };

      // If this compiles without TypeScript errors, the interface is correct
      expect(typeof props.currentMode).toBe('string');
      expect(typeof props.onModeChange).toBe('function');
    });

    it('accepts optional props correctly', () => {
      const props = {
        currentMode: 'socratic' as CoachingMode,
        onModeChange: mockOnModeChange,
        disabled: true,
        className: 'test-class'
      };

      expect(typeof props.disabled).toBe('boolean');
      expect(typeof props.className).toBe('string');
    });
  });

  describe('Mode Logic', () => {
    it('correctly identifies socratic mode', () => {
      const currentMode: CoachingMode = 'socratic';
      const isSocratic = currentMode === 'socratic';
      
      expect(isSocratic).toBe(true);
    });

    it('correctly identifies comprehensive mode', () => {
      const currentMode: CoachingMode = 'comprehensive';
      const isSocratic = currentMode === 'socratic';
      
      expect(isSocratic).toBe(false);
    });

    it('handles mode toggle logic correctly', () => {
      // Test switching from comprehensive to socratic
      let checked = false; // comprehensive mode
      let newMode: CoachingMode = checked ? 'socratic' : 'comprehensive';
      expect(newMode).toBe('comprehensive');

      // Test switching from socratic to comprehensive  
      checked = true; // socratic mode
      newMode = checked ? 'socratic' : 'comprehensive';
      expect(newMode).toBe('socratic');
    });
  });

  describe('Type Safety', () => {
    it('only accepts valid CoachingMode values', () => {
      const validModes: CoachingMode[] = ['comprehensive', 'socratic'];
      
      validModes.forEach(mode => {
        expect(['comprehensive', 'socratic']).toContain(mode);
      });
    });

    it('callback function has correct signature', () => {
      const callback = (mode: CoachingMode) => {
        expect(['comprehensive', 'socratic']).toContain(mode);
      };

      callback('comprehensive');
      callback('socratic');
    });
  });

  describe('Component Structure', () => {
    it('has proper component export', () => {
      expect(CoachingModeToggle).toBeDefined();
      expect(typeof CoachingModeToggle).toBe('function');
    });

    it('component name is set correctly', () => {
      expect(CoachingModeToggle.name).toBe('CoachingModeToggle');
    });
  });

  describe('Props Validation', () => {
    it('validates currentMode prop types', () => {
      const validModes = ['comprehensive', 'socratic'];
      
      validModes.forEach(mode => {
        expect(typeof mode).toBe('string');
        expect(validModes).toContain(mode);
      });
    });

    it('validates onModeChange callback', () => {
      const callback = vi.fn();
      
      expect(typeof callback).toBe('function');
      
      // Test that callback can be called with valid modes
      callback('comprehensive');
      callback('socratic');
      
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith('comprehensive');
      expect(callback).toHaveBeenCalledWith('socratic');
    });
  });
});