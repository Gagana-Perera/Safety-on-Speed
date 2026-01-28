import { supabase } from '@/lib/superbase';
import { useState } from 'react';
import { Alert } from 'react-native';

export const useOTP = () => {
    const [otpPhone, setOtpPhone] = useState('+94');
    const [otp, setOtp] = useState('');
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [otpStep, setOtpStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const sendOtp = async (captchaToken: string) => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            phone: otpPhone,
            options: { captchaToken }
        });
        setLoading(false);

        if (error) {
            Alert.alert("Error sending OTP", error.message);
        } else {
            setOtpStep(2);
        }
    };

    const verifyOtp = async () => {
        setLoading(true);
        const { error } = await supabase.auth.verifyOtp({
            phone:otpPhone,
            token: otp,
            type: 'sms',
        });
        setLoading(false);

        if (error) {
            Alert.alert("Error", "Invalid OTP. " + error.message);
        } else {
            Alert.alert("Success", "Phone verified successfully!");
            setIsPhoneVerified(true);
        }
    };

    return {
        otpPhone, setOtpPhone,
        otp, setOtp,
        isPhoneVerified,
        otpStep, setOtpStep,
        loading,
        sendOtp,
        verifyOtp,
    };
};