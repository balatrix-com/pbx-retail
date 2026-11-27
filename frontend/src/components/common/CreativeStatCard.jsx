import React from 'react';
import { clsx } from 'clsx';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * CreativeStatCard
 * Theme-Adaptive replica of the "Creative Stat Blocks With floating elements" design reference:
 * - In Dark Mode: Deep dark space-glass (`dark:bg-[#0a0f1d]/85`, `dark:border-white/[0.12]`) with neon glow and bright white numbers.
 * - In Light Mode: Elegant, pristine pearl/frosted glass (`bg-white/95`, `border-slate-200/90`, `shadow-xl shadow-slate-200/70`)
 *   with crisp dark typography (`text-slate-900`), soft translucent tinting, and color-matched vibrant floating elements.
 */

const THEME_VARIANT = {
    hexBg: 'from-primary-600 via-primary-500 to-emerald-400',
    hexShadow: 'shadow-[0_10px_25px_-5px_rgb(var(--color-primary-500-rgb)/0.45)] dark:shadow-[0_10px_25px_-5px_rgb(var(--color-primary-500-rgb)/0.7)]',
    glowAura: 'radial-gradient(ellipse at center, rgb(var(--color-primary-500-rgb) / 0.2) 0%, rgb(var(--color-primary-500-rgb) / 0) 70%)',
    darkGlowAura: 'radial-gradient(ellipse at center, rgb(var(--color-primary-500-rgb) / 0.35) 0%, rgb(var(--color-primary-500-rgb) / 0) 70%)',
    pillBg: 'bg-primary-50 dark:bg-primary-900/85 border-primary-300 dark:border-primary-400/50 text-primary-700 dark:text-primary-300',
    pillShadow: 'shadow-[0_4px_12px_rgb(var(--color-primary-400-rgb)/0.2)] dark:shadow-[0_4px_16px_rgb(var(--color-primary-400-rgb)/0.35)]',
    pillArrow: 'text-primary-600 dark:text-primary-300',
    podBorder: 'border-primary-200/70 hover:border-primary-400 dark:border-white/[0.12] dark:hover:border-primary-500/50',
    dotColor: 'bg-primary-500 dark:bg-primary-400',
    dotGlow: 'shadow-[0_0_10px_rgb(var(--color-primary-500-rgb)/0.6)] dark:shadow-[0_0_12px_var(--color-primary-400)]',
};

const COLOR_VARIANTS = {
    blue: THEME_VARIANT,
    purple: THEME_VARIANT,
    emerald: THEME_VARIANT,
    teal: THEME_VARIANT,
    amber: THEME_VARIANT,
    rose: THEME_VARIANT,
    cyan: THEME_VARIANT,
};

const CreativeStatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color = 'blue',
    trend = '+12%',
    trendUp = true,
    badgeText,
    onClick,
    actionButton,
    className
}) => {
    const variant = COLOR_VARIANTS[color] || COLOR_VARIANTS.blue;

    return (
        <div
            onClick={onClick}
            className={clsx(
                "relative group isolate select-none transition-all duration-300 py-3 pl-3 pr-2",
                onClick && "cursor-pointer active:scale-[0.98]",
                className
            )}
        >
            {/* Ambient Background Aura Glow - Light Mode soft aura & Dark Mode neon aura */}
            <div
                className="absolute -inset-2 rounded-[3.5rem] opacity-35 dark:opacity-40 group-hover:opacity-75 blur-2xl transition-all duration-500 pointer-events-none"
                style={{ background: variant.darkGlowAura }}
            />

            {/* Glowing cosmic accent orb / spark in upper corner */}
            <div
                className={clsx(
                    "absolute -top-0.5 right-6 w-2.5 h-2.5 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125 z-20",
                    variant.dotColor,
                    variant.dotGlow
                )}
            />

            {/* Main Rounded Glass Capsule / Pod: White frosted glass in light mode, Space-dark in dark mode */}
            <div
                className={clsx(
                    "relative rounded-[2.5rem] sm:rounded-[3rem] px-5 sm:px-6 py-4 sm:py-5 min-h-[108px] flex items-center transition-all duration-300 backdrop-blur-2xl",
                    "bg-white/95 dark:bg-[#0a0f1d]/85 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06)] dark:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.6)] border",
                    variant.podBorder
                )}
            >
                {/* Internal top glass specular highlight */}
                <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-slate-300/40 dark:via-white/20 to-transparent pointer-events-none" />

                {/* Left Floating 3D Teardrop / Petal Badge */}
                <div className="relative -ml-8 sm:-ml-9 shrink-0 flex items-center justify-center z-10">
                    {/* Atmospheric glow behind petal */}
                    <div
                        className="absolute inset-0 rounded-[50%_50%_50%_18%] blur-lg opacity-65 dark:opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{ background: variant.darkGlowAura }}
                    />

                    {/* Teardrop / Petal Body with glossy 3D highlight */}
                    <div
                        className={clsx(
                            "relative w-[68px] h-[68px] sm:w-[74px] sm:h-[74px] rounded-[50%_50%_50%_18%] flex items-center justify-center text-white transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 overflow-hidden",
                            "bg-gradient-to-br border border-white/50 ring-1 ring-inset ring-white/30",
                            variant.hexBg,
                            variant.hexShadow
                        )}
                    >
                        {/* Internal glossy sheen */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/15 pointer-events-none" />
                        <div className="absolute top-1.5 left-3 w-6 h-3 rounded-full bg-white/45 blur-[1px] -rotate-12 pointer-events-none" />

                        {Icon && (
                            <Icon className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] stroke-[2.2]" />
                        )}
                    </div>
                </div>

                {/* Stat Content: Label on top, Big Bold Numeric Value below */}
                <div className="ml-3 sm:ml-4 flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-300/90 tracking-wider truncate font-mono">
                            {title}
                        </span>
                        {badgeText && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/10 dark:text-white dark:border-white/15 font-mono">
                                {badgeText}
                            </span>
                        )}
                    </div>

                    <div className="mt-0.5 flex items-baseline">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-xs truncate font-display">
                            {value}
                        </span>
                    </div>

                    {subtitle && (
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400/80 font-medium truncate mt-0.5 font-sans">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Floating Bottom-Right Pill Badge matching reference exactly */}
                {trend && (
                    <div
                        className={clsx(
                            "absolute -bottom-2.5 sm:-bottom-3 right-5 sm:right-6 z-20",
                            "inline-flex items-center gap-1 px-3 py-1 sm:px-3.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold border backdrop-blur-xl transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 font-mono",
                            variant.pillBg,
                            variant.pillShadow
                        )}
                    >
                        {trendUp ? (
                            <ArrowUpRight size={13} className={clsx("stroke-[2.5]", variant.pillArrow)} />
                        ) : (
                            <ArrowDownRight size={13} className="stroke-[2.5] text-rose-500 dark:text-rose-400" />
                        )}
                        <span className="tracking-tight">{trend}</span>
                    </div>
                )}

                {/* Optional action button if provided */}
                {actionButton && (
                    <div className="absolute right-4 top-3 z-10">
                        {actionButton}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreativeStatCard;
