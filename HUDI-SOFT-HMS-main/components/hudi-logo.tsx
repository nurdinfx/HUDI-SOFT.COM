import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-8',
  md: 'h-14',
  lg: 'h-20',
  xl: 'h-28',
} as const;

type HudiLogoProps = {
  className?: string;
  size?: keyof typeof SIZES;
  showTagline?: boolean;
  tagline?: string;
};

/** HUDI SOFT company logo — used in app UI, activation, and login screens */
export function HudiLogo({
  className,
  size = 'md',
  showTagline = false,
  tagline = 'Hospital Management System',
}: HudiLogoProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <img
        src="/logo.png"
        alt="HUDI SOFT"
        className={cn('w-auto object-contain', SIZES[size])}
      />
      {showTagline && (
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-500/90">
          {tagline}
        </span>
      )}
    </div>
  );
}
