import { Palette, Frame, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CosmeticPreviewProps {
  subCategory: 'profile_theme' | 'avatar_frame' | 'display_title';
  metadata: Record<string, unknown>;
  className?: string;
}

const CosmeticPreview = ({ subCategory, metadata, className }: CosmeticPreviewProps) => {
  if (subCategory === 'profile_theme') {
    const primary = (metadata.accent_primary as string) ?? '#3b82f6';
    const bg = (metadata.accent_bg as string) ?? '#eff6ff';
    return (
      <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center', className)} style={{ background: bg }}>
        <Palette className="h-6 w-6" style={{ color: primary }} />
      </div>
    );
  }

  if (subCategory === 'avatar_frame') {
    const borderColor = (metadata.border_color as string) ?? '#EAB308';
    const shadow = (metadata.box_shadow as string) ?? 'none';
    return (
      <div
        className={cn('w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center', className)}
        style={{ border: `3px solid ${borderColor}`, boxShadow: shadow }}
      >
        <Frame className="h-6 w-6 text-slate-400" />
      </div>
    );
  }

  if (subCategory === 'display_title') {
    const textColor = (metadata.text_color as string) ?? '#2563eb';
    const displayText = (metadata.display_text as string) ?? 'Title';
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Crown className="h-4 w-4" style={{ color: textColor }} />
        <span className="text-sm font-bold italic" style={{ color: textColor }}>{displayText}</span>
      </div>
    );
  }

  return null;
};

export default CosmeticPreview;
