import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  primary: 'bg-leaf-700 text-white shadow-sm hover:bg-leaf-800 disabled:bg-leaf-700/50',
  secondary: 'border border-line-strong bg-white text-ink shadow-sm hover:border-ink-faint hover:bg-paper',
  ghost: 'text-ink-soft hover:bg-ink/[0.05] hover:text-ink',
  danger: 'bg-clay-600 text-white shadow-sm hover:bg-clay-700',
};

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-9 gap-2 px-4 text-[14px]',
  lg: 'h-11 gap-2 px-5 text-[15px]',
  icon: 'h-8 w-8 justify-center',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-medium transition duration-150',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
});

export default Button;
