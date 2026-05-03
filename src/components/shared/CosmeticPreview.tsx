// =============================================================================
// CosmeticPreview — Theme/frame/title preview component
// =============================================================================

import { Palette, Frame, Crown, Sparkles } from 'lucide-react';
import { resolveThemeCSS, resolveFrameCSS } from '@/lib/themeResolver';
import type { ThemeMetadata, FrameMetadata } from '@/lib/themeResolver';
import { cn } from '@/lib/utils';

interface CosmeticPreviewProps {
  subCategory: string;
  metadata: Record<string, unknown>;
  name: string;
  className?: string;
}

const CosmeticPreview = ({ subCategory, metadata, name, className }: CosmeticPreviewProps) => {
  if (subCategory === 'profile_theme') {
    return <ThemePreview metadata={metadata} name={name} className={className} />;
  }

  if (subCategory === 'avatar_frame') {
    return <FramePreview metadata={metadata} name={name} className={className} />;
  }

  if (subCategory === 'display_title') {
    return <TitlePreview metadata={metadata} name={name} className={className} />;
  }

  return (
    <div className={cn('flex items-center justify-center rounded-lg bg-slate-50 p-4', className)}>
      <Sparkles className="h-8 w-8 text-slate-400" />
    </div>
  );
};

// ─── Theme Preview ───────────────────────────────────────────────────────────

const ThemePreview = ({
  metadata,
  name,
  className,
}: {
  metadata: Record<string, unknown>;
  name: string;
  className?: string;
}) => {
  const themeData: ThemeMetadata = {
    accent_primary: (metadata.accent_primary as string) ?? '#3b82f6',
    accent_secondary: (metadata.accent_secondary as string) ?? '#2563eb',
    accent_bg: (metadata.accent_bg as string) ?? '#eff6ff',
    gradient_start: (metadata.gradient_start as string) ?? '#14b8a6',
    gradient_end: (metadata.gradient_end as string) ?? '#3b82f6',
  };

  const cssVars = resolveThemeCSS(themeData);

  return (
    <div className={cn('rounded-lg overflow-hidden border border-slate-200', className)}>
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{
          background: `linear-gradient(135deg, ${cssVars['--theme-gradient-start']}, ${cssVars['--theme-gradient-end']})`,
        }}
      >
        <Palette className="h-4 w-4 text-white" />
        <span className="text-xs font-bold text-white truncate">{name}</span>
      </div>
      <div className="p-3 space-y-1.5" style={{ backgroundColor: cssVars['--theme-accent-bg'] }}>
        <div
          className="h-2 w-3/4 rounded-full"
          style={{ backgroundColor: cssVars['--theme-accent'] }}
        />
        <div
          className="h-2 w-1/2 rounded-full opacity-60"
          style={{ backgroundColor: cssVars['--theme-accent'] }}
        />
      </div>
    </div>
  );
};

// ─── Frame Preview ───────────────────────────────────────────────────────────

const FramePreview = ({
  metadata,
  name,
  className,
}: {
  metadata: Record<string, unknown>;
  name: string;
  className?: string;
}) => {
  const frameData: FrameMetadata = {
    border_color: (metadata.border_color as string) ?? '#3b82f6',
    border_width: (metadata.border_width as string) ?? '3px',
    border_style: (metadata.border_style as string) ?? 'solid',
    border_radius: (metadata.border_radius as string) ?? '50%',
    box_shadow: (metadata.box_shadow as string) ?? undefined,
  };

  const cssVars = resolveFrameCSS(frameData);

  return (
    <div className={cn('flex flex-col items-center gap-2 p-3', className)}>
      <div
        className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center"
        style={{
          border: `${cssVars['--frame-border-width']} ${cssVars['--frame-border-style'] ?? 'solid'} ${cssVars['--frame-border-color']}`,
          borderRadius: cssVars['--frame-border-radius'] ?? '50%',
          boxShadow: cssVars['--frame-glow'] ?? 'none',
        }}
      >
        <Frame className="h-5 w-5 text-slate-400" />
      </div>
      <span className="text-xs font-medium text-slate-600 truncate">{name}</span>
    </div>
  );
};

// ─── Title Preview ───────────────────────────────────────────────────────────

const TitlePreview = ({
  metadata,
  name,
  className,
}: {
  metadata: Record<string, unknown>;
  name: string;
  className?: string;
}) => {
  const titleText = (metadata.title_text as string) ?? name;
  const titleColor = (metadata.title_color as string) ?? '#6366f1';

  return (
    <div className={cn('flex flex-col items-center gap-1.5 p-3', className)}>
      <Crown className="h-5 w-5" style={{ color: titleColor }} />
      <span className="text-xs font-bold" style={{ color: titleColor }}>
        {titleText}
      </span>
    </div>
  );
};

export default CosmeticPreview;
