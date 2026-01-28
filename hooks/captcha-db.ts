import Hcaptcha from '@hcaptcha/react-native-hcaptcha';
import { useRef } from 'react';
import { WebViewMessageEvent } from 'react-native-webview';

export const useCaptcha = (onTokenReceived: (token: string) => void) => {
    const captchaRef = useRef<Hcaptcha>(null);
    const hCaptchasiteKey = process.env.HCAPTCHA_SITE_KEY;

    const showCaptcha = () => {
        captchaRef.current?.show();
    };

    const onCaptchaMessage = (event: WebViewMessageEvent) => {
        if (event && event.nativeEvent.data) {
            const data = event.nativeEvent.data;
            if (['cancel', 'error', 'expired'].includes(data)) return;
            
            onTokenReceived(data);
        }
    };

    return {
        captchaRef,
        hCaptchasiteKey,
        showCaptcha,
        onCaptchaMessage
    };
};