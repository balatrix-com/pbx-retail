import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const ZohoChatWidget = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        // Set Zoho Widget Properties dynamically based on the logged-in user
        window.ZOHOIM = window.ZOHOIM || {};
        window.ZOHOIM.widgetProps = {
            contactInfo: {
                name: user.name || user.email.split('@')[0], // Fallback to email prefix if name is empty
                email: user.email,
                // Only pass phone if it exists and looks somewhat like a number (Zoho requires E.164 context typically)
                ...(user.phone && { phone: user.phone })
            },
            customFields: {
                companyname: user.tenant?.name || 'Unknown',
                accountid: user.tenantId,
                role: user.role
            }
        };

        // Check if the script is already injected to prevent duplicates if component remounts
        if (!document.getElementById('zoho-chat-widget-script')) {
            const script = document.createElement('script');
            script.id = 'zoho-chat-widget-script';
            script.type = 'text/javascript';
            script.defer = true;
            script.src = "https://im.zohocloud.ca/api/v1/public/channel/e477592f4fd856098253ecfb990dd79a/widget";
            document.head.appendChild(script);
        }

        // Cleanup function (optional, but good practice). In many cases, you might want to leave the chat bubble alive
        // even if the component unmounts briefly, but for strict cleanup:
        return () => {
            // We intentionally do NOT remove the script here because Zoho's widget might 
            // still be initializing and removing the script tag doesn't perfectly destroy the iframe/widget.
            // If manual destruction is needed, Zoho often provides a global method like window.ZOHOIM.blur()
        };

    }, [user]);

    return null; // This component doesn't render any UI itself, the script injects an iframe
};

export default ZohoChatWidget;
