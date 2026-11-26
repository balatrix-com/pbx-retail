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

const COLOR_VARIANTS = {
    blue: {
        // Vibrant bright blue matching "Organizations 7"
        hexBg: 'from-[#2563eb] via-[#3b82f6] to-[#60a5fa]',
        hexShadow: 'shadow-[0_10px_25px_-5px_rgba(37,99,235,0.45)] dark:shadow-[0_10px_25px_-5px_rgba(37,99,235,0.7)]',
        glowAura: 'radial-gradient(ellipse at center, rgba(37,99,235,0.2) 0%, rgba(37,99,235,0) 70%)',
        darkGlowAura: 'radial-gradient(ellipse at center, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0) 70%)',
        pillBg: 'bg-emerald-50 dark:bg-[#064e3b]/85 border-emerald-300 dark:border-[#10b981]/50 text-emerald-700 dark:text-[#34d399]',
        pillShadow: 'shadow-[0_4px_12px_rgba(16,185,129,0.2)] dark:shadow-[0_4px_16px_rgba(16,185,129,0.35)]',
        pillArrow: 'text-emerald-600 dark:text-[#34d399]',
        podBorder: 'border-blue-200/70 hover:border-blue-400 dark:border-white/[0.12] dark:hover:border-[#3b82f6]/50',
        dotColor: 'bg-blue-500 dark:bg-[#60a5fa]',
        dotGlow: 'shadow-[0_0_10px_rgba(59,130,246,0.6)] dark:shadow-[0_0_12px_#38bdf8]',
    },
    purple: {
        // Deep electric purple/magenta matching "Users 8"
        hexBg: 'from-[#7c3aed] via-[#9333ea] to-[#c084fc]',
        hexShadow: 'shadow-[0_10px_25px_-5px_rgba(147,51,234,0.45)] dark:shadow-[0_10px_25px_-5px_rgba(147,51,234,0.7)]',
        glowAura: 'radial-gradient(ellipse at center, rgba(147,51,234,0.2) 0%, rgba(147,51,234,0) 70%)',
        darkGlowAura: 'radial-gradient(ellipse at center, rgba(147,51,234,0.35) 0%, rgba(147,51,234,0) 70%)',
        pillBg: 'bg-purple-50 dark:bg-[#3b0764]/85 border-purple-300 dark:border-[#a855f7]/50 text-purple-700 dark:text-[#d8b4fe]',
        pillShadow: 'shadow-[0_4px_12px_rgba(168,85,247,0.2)] dark:shadow-[0_4px_16px_rgba(168,85,247,0.35)]',
        pillArrow: 'text-purple-600 dark:text-[#d8b4fe]',
        podBorder: 'border-purple-200/70 hover:border-purple-400 dark:border-white/[0.12] dark:hover:border-[#a855f7]/50',
        dotColor: 'bg-purple-500 dark:bg-[#c084fc]',
        dotGlow: 'shadow-[0_0_10px_rgba(168,85,247,0.6)] dark:shadow-[0_0_12px_#c084fc]',
    },
    emerald: {
        // Bright emerald/mint matching "Float Balance $4729.94"
        hexBg: 'from-[#059669] via-[#10b981] to-[#34d399]',
        hexShadow: 'shadow-[0_10px_25px_-5px_rgba(16,185,129,0.45)] dark:shadow-[0_10px_25px_-5px_rgba(16,185,129,0.7)]',
        glowAura: 'radial-gradient(ellipse at center, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0) 70%)',
        darkGlowAura: 'radial-gradient(ellipse at center, rgba(16,185,129,0.35) 0%, rgba(16,185,129,0) 70%)',
        pillBg: 'bg-emerald-50 dark:bg-[#064e3b]/85 border-emerald-300 dark:border-[#10b981]/50 text-emerald-700 dark:text-[#34d399]',
        pillShadow: 'shadow-[0_4px_12px_rgba(16,185,129,0.2)] dark:shadow-[0_4px_16px_rgba(16,185,129,0.35)]',
        pillArrow: 'text-emerald-600 dark:text-[#34d399]',
        podBorder: 'border-emerald-200/70 hover:border-emerald-400 dark:border-white/[0.12] dark:hover:border-[#10b981]/50',
        dotColor: 'bg-emerald-500 dark:bg-[#34d399]',
        dotGlow: 'shadow-[0_0_10px_rgba(16,185,129,0.6)] dark:shadow-[0_0_12px_#34d399]',
    },
    teal: {
        // Dynamic primary theme variant
        hexBg: 'from-primary-600 via-primary-500 to-primary-400',
        hexShadow: 'shadow-[0_10px_25px_-5px_rgb(var(--color-primary-500-rgb)/0.45)] dark:shadow-[0_10px_25px_-5px_rgb(var(--color-primary-500-rgb)/0.7)]',
        glowAura: 'radial-gradient(ellipse at center, rgb(var(--color-primary-500-rgb) / 0.2) 0%, rgb(var(--color-primary-500-rgb) / 0) 70%)',
        darkGlowAura: 'radial-gradient(ellipse at center, rgb(var(--color-primary-500-rgb) / 0.35) 0%, rgb(var(--color-primary-500-rgb) / 0) 70%)',
        pillBg: 'bg-primary-50 dark:bg-primary-900/85 border-primary-300 dark:border-primary-400/50 text-primary-700 dark:text-primary-300',
        pillShadow: 'shadow-[0_4px_12px_rgb(var(--color-primary-400-rgb)/0.2)] dark:shadow-[0_4px_16px_rgb(var(--color-primary-400-rgb)/0.35)]',
        pillArrow: 'text-primary-600 dark:text-primary-300',
        podBorder: 'border-primary-200/70 hover:border-primary-400 dark:border-white/[0.12] dark:hover:border-primary-500/50',
        dotColor: 'bg-primary-500 dark:bg-primary-400',
        dotGlow: 'shadow-[0_0_10px_rgb(var(--color-primary-500-rgb)/0.6)] dark:shadow-[0_0_12px_var(--color-primary-400)]',
    },
    amber: {
        // Warm gold/amber variant
        hexBg: 'from-[#d97706] via-[#f59e0b] to-[#fbbf24]',
        hexShadow: 'shadow-[0_10px_25px_-5px_rgba(245,158,11,0.45)] dark:shadow-[0_10px_25px_-5px_rgba(245,158,11,0.7)]',
        glowAura: 'radial-gradient(ellipse at center, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0) 70%)',
        darkGlowAura: 'radial-gradient(ellipse at center, rgba(245,158,11,0.35) 0%, rgba(245,158,11,0) 70%)',
        pillBg: 'bg-amber-50 dark:bg-[#78350f]/85 border-amber-300 dark:border-[#fbbf24]/50 text-amber-700 dark:text-[#fde68a]',
        pillShadow: 'shadow-[0_4px_12px_rgba(245,158,11,0.2)] dark:shadow-[0_4px_16px_rgba(245,158,11,0.35)]',
        pillArrow: 'text-amber-600 dark:text-[#fde68a]',
        podBorder: 'border-amber-200/70 hover:border-amber-400 dark:border-white/[0.12] dark:hover:border-[#f59e0b]/50',
        dotColor: 'bg-amber-500 dark:bg-[#fbbf24]',
        dotGlow: 'shadow-[0_0_10px_rgba(245,158,11,0.6)] dark:shadow-[0_0_12px_#fbbf24]',
    },
    rose: {
        // Rose/crimson variant
        hexBg: 'from-[#e11d48] via-[#f43f5e] to-[#fb7185]',
        hexShadow: 'shadow-[0_10px_25px_-5px_rgba(244,63,94,0.45)] dark:shadow-[0_10px_25px_-5px_rgba(244,63,94,0.7)]',
        glowAura: 'radial-gradient(ellipse at center, rgba(244,63,94,0.2) 0%, rgba(244,63,94,0) 70%)',
        darkGlowAura: 'radial-gradient(ellipse at center, rgba(244,63,94,0.35) 0%, rgba(244,63,94,0) 70%)',
        pillBg: 'bg-rose-50 dark:bg-[#881337]/85 border-rose-300 dark:border-[#fb7185]/50 text-rose-700 dark:text-[#fecdd3]',
        pillShadow: 'shadow-[0_4px_12px_rgba(244,63,94,0.2)] dark:shadow-[0_4px_16px_rgba(244,63,94,0.35)]',
        pillArrow: 'text-rose-600 dark:text-[#fecdd3]',
        podBorder: 'border-rose-200/70 hover:border-rose-400 dark:border-white/[0.12] dark:hover:border-[#f43f5e]/50',
        dotColor: 'bg-rose-500 dark:bg-[#fb7185]',
        dotGlow: 'shadow-[0_0_10px_rgba(244,63,94,0.6)] dark:shadow-[0_0_12px_#fb7185]',
    },
    cyan: {
        // Electric neon cyan variant
        hexBg: 'from-[#0891b2] via-[#06b6d4] to-[#67e8f9]',
        hexShadow: 'shadow-[0_10px_25px_-5px_rgba(6,182,212,0.45)] dark:shadow-[0_10px_25px_-5px_rgba(6,182,212,0.7)]',
        glowAura: 'radial-gradient(ellipse at center, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0) 70%)',
        darkGlowAura: 'radial-gradient(ellipse at center, rgba(6,182,212,0.35) 0%, rgba(6,182,212,0) 70%)',
        pillBg: 'bg-cyan-50 dark:bg-[#164e63]/85 border-cyan-300 dark:border-[#67e8f9]/50 text-cyan-700 dark:text-[#a5f3fc]',
        pillShadow: 'shadow-[0_4px_12px_rgba(6,182,212,0.2)] dark:shadow-[0_4px_16px_rgba(6,182,212,0.35)]',
        pillArrow: 'text-cyan-600 dark:text-[#a5f3fc]',
        podBorder: 'border-cyan-200/70 hover:border-cyan-400 dark:border-white/[0.12] dark:hover:border-[#06b6d4]/50',
        dotColor: 'bg-cyan-500 dark:bg-[#67e8f9]',
        dotGlow: 'shadow-[0_0_10px_rgba(6,182,212,0.6)] dark:shadow-[0_0_12px_#67e8f9]',
    }
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

                {/* Left Floating Hexagonal 3D Gem Badge */}
                <div className="relative -ml-8 sm:-ml-9 shrink-0 flex items-center justify-center z-10">
                    {/* Atmospheric glow behind badge */}
                    <div
                        className="absolute inset-0 rounded-2xl blur-lg opacity-70 dark:opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{ background: variant.darkGlowAura }}
                    />

                    {/* Hexagon Gem Body with crisp inset bevels */}
                    <div
                        className={clsx(
                            "relative w-[68px] h-[76px] sm:w-[74px] sm:h-[82px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-0.5",
                            "bg-gradient-to-br border border-white/40",
                            variant.hexBg,
                            variant.hexShadow
                        )}
                        style={{
                            clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
                        }}
                    >
                        {/* Internal specular facet shine */}
                        <div
                            className="absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-black/20 pointer-events-none"
                            style={{
                                clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
                            }}
                        />

                        {Icon && (
                            <Icon className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] stroke-[2.2]" />
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
