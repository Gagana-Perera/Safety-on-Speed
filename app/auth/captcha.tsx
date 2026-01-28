import Hcaptcha from '@hcaptcha/react-native-hcaptcha';
import React from 'react';
import { WebViewMessageEvent } from 'react-native-webview';

interface CaptchaProps {
    captchaRef: React.RefObject<Hcaptcha>;
    siteKey: string;
    onMessage: (event: WebViewMessageEvent) => void;
    baseUrl?: string;
}

export default function Captcha({ 
    captchaRef, 
    siteKey, 
    onMessage, 
    baseUrl = "http://localhost" 
}: CaptchaProps) {
    return (
        <Hcaptcha
            ref={captchaRef}
            siteKey={siteKey}
            baseUrl={baseUrl}
            languageCode="en"
            onMessage={onMessage}
            size="normal"
        />
    );
}