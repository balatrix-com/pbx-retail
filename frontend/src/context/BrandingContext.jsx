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
        
        return {
            50: rgbToHex(mix(base, white, 0.95).r, mix(base, white, 0.95).g, mix(base, white, 0.95).b),
            100: rgbToHex(mix(base, white, 0.9).r, mix(base, white, 0.9).g, mix(base, white, 0.9).b),
            200: rgbToHex(mix(base, white, 0.7).r, mix(base, white, 0.7).g, mix(base, white, 0.7).b),
            300: rgbToHex(mix(base, white, 0.5).r, mix(base, white, 0.5).g, mix(base, white, 0.5).b),
            400: rgbToHex(mix(base, white, 0.3).r, mix(base, white, 0.3).g, mix(base, white, 0.3).b),
            500: baseHex,
            600: rgbToHex(mix(base, black, 0.15).r, mix(base, black, 0.15).g, mix(base, black, 0.15).b),
            700: rgbToHex(mix(base, black, 0.3).r, mix(base, black, 0.3).g, mix(base, black, 0.3).b),
            800: rgbToHex(mix(base, black, 0.45).r, mix(base, black, 0.45).g, mix(base, black, 0.45).b),
            900: rgbToHex(mix(base, black, 0.6).r, mix(base, black, 0.6).g, mix(base, black, 0.6).b),
            950: rgbToHex(mix(base, black, 0.75).r, mix(base, black, 0.75).g, mix(base, black, 0.75).b),
        };
    } catch (e) {
        console.error('Error generating shades for base color:', baseHex, e);
        return null;
    }
}

export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState({
        name: 'Cloud PBX',
        logoMain: '/svg logo/logo-main.svg',
        logoSidebar: '/svg logo/logo-main.svg',
        favicon: '/svg logo/favicon.svg',
        primaryColor: '#3d52a0',
        accentColor: '#ed8f55',
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
                const root = document.documentElement;
                if (data.primaryColor) {
                    root.style.setProperty('--color-primary', data.primaryColor);
                    const shades = getShades(data.primaryColor);
                    if (shades) {
                        Object.entries(shades).forEach(([weight, hex]) => {
                            root.style.setProperty(`--color-primary-${weight}`, hex);
                        });
                    }
                }
                if (data.accentColor) {
                    root.style.setProperty('--color-accent', data.accentColor);
                    // Map secondary to accent for design compatibility
                    root.style.setProperty('--color-secondary', data.accentColor);
                }

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
