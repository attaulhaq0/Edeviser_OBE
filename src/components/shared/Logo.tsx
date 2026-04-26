import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
  xl: 'h-20',
} as const;

const Logo = ({ variant = 'full', size = 'md', className }: LogoProps) => {
  const src = variant === 'icon'
    ? '/logos/e deviser logo.jpg'
    : '/logos/e deviser logo 2.jpg';

  return (
    <img
      src={src}
      alt="Edeviser"
      className={cn(sizeMap[size], 'w-auto object-contain', className)}
    />
  );
};

export default Logo;
