import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getMediaUrl } from '../utils/media.utils';

const BrandingContext = createContext(null);

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}

function mix(color, mixColor, weight) {
    const w = weight;
    const wInverse = 1 - weight;
    const r = Math.round(color.r * wInverse + mixColor.r * w);
    const g = Math.round(color.g * wInverse + mixColor.g * w);
    const b = Math.round(color.b * wInverse + mixColor.b * w);
    return { r, g, b };
}

function getShades(baseHex) {
    if (!baseHex || !baseHex.startsWith('#') || baseHex.length !== 7) return null;
    try {
        const base = hexToRgb(baseHex);
        const white = { r: 255, g: 255, b: 255 };
        const black = { r: 0, g: 0, b: 0 };

        const build = (rgb) => ({
            hex: rgbToHex(rgb.r, rgb.g, rgb.b),
            rgb: `${rgb.r} ${rgb.g} ${rgb.b}`,
        });

        return {
            50: build(mix(base, white, 0.95)),
            100: build(mix(base, white, 0.9)),
            200: build(mix(base, white, 0.7)),
            300: build(mix(base, white, 0.5)),
            400: build(mix(base, white, 0.3)),
            500: build(base),
            600: build(mix(base, black, 0.15)),
            700: build(mix(base, black, 0.3)),
            800: build(mix(base, black, 0.45)),
            900: build(mix(base, black, 0.6)),
            950: build(mix(base, black, 0.75)),
        };
    } catch (e) {
        console.error('Error generating shades for base color:', baseHex, e);
        return null;
    }
}

export function applyBrandingColors(primaryColor, accentColor) {
    const root = document.documentElement;
    if (primaryColor) {
        root.style.setProperty('--color-primary', primaryColor);
        const shades = getShades(primaryColor);
        if (shades) {
            Object.entries(shades).forEach(([weight, { hex, rgb }]) => {
                root.style.setProperty(`--color-primary-${weight}`, hex);
                root.style.setProperty(`--color-primary-${weight}-rgb`, rgb);
                root.style.setProperty(`--color-teal-${weight}`, hex);
            });
        }
    }
    if (accentColor) {
        root.style.setProperty('--color-accent', accentColor);
        root.style.setProperty('--color-secondary', accentColor);
        const accentShades = getShades(accentColor);
        if (accentShades) {
            Object.entries(accentShades).forEach(([weight, { hex, rgb }]) => {
                root.style.setProperty(`--color-accent-${weight}`, hex);
                root.style.setProperty(`--color-accent-${weight}-rgb`, rgb);
                root.style.setProperty(`--color-emerald-${weight}`, hex);
            });
        }
    }
}

export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState({
        name: 'Cloud PBX',
        logoMain: '/svg logo/logo-main.svg',
        logoSidebar: '/svg logo/logo-main.svg',
        favicon: '/svg logo/favicon.svg',
        primaryColor: '#0d9488',
        accentColor: '#14b8a6',
        supportEmail: 'support@telecom-platform.com',
        supportPhone: '+1-800-555-0199',
    });
    const [loading, setLoading] = useState(true);

    const fetchBranding = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const response = await axios.get(`${apiBaseUrl}/branding`);

            if (response.data) {
                const data = response.data;
                setBranding(data);

                // Inject CSS custom variables into root element
                applyBrandingColors(data.primaryColor, data.accentColor);

                // Dynamically set title and favicon
                if (data.name) {
                    document.title = data.name;
                }
                if (data.favicon) {
                    let link = document.querySelector("link[rel~='icon']");
                    if (!link) {
                        link = document.createElement('link');
                        link.rel = 'icon';
                        document.getElementsByTagName('head')[0].appendChild(link);
                    }
                    const fullFaviconUrl = getMediaUrl(data.favicon);
                    if (data.favicon.endsWith('.png')) {
                        link.type = 'image/png';
                    } else if (data.favicon.endsWith('.svg')) {
                        link.type = 'image/svg+xml';
                    } else if (data.favicon.endsWith('.ico')) {
                        link.type = 'image/x-icon';
                    } else {
                        link.removeAttribute('type');
                    }
                    link.href = `${fullFaviconUrl}${fullFaviconUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
                }
            }
        } catch (error) {
            console.error('Failed to load branding:', error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranding(true);
    }, []);

    return (
        <BrandingContext.Provider value={{ branding, loading, refreshBranding: fetchBranding }}>
            {!loading && children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => {
    const context = useContext(BrandingContext);
    if (!context) {
        throw new Error('useBranding must be used within a BrandingProvider');
    }
    return context;
};
