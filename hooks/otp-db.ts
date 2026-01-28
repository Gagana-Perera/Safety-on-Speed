import { supabase } from '@/lib/superbase'; // Ensure this path is correct
import Hcaptcha from '@hcaptcha/react-native-hcaptcha';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { WebViewMessageEvent } from 'react-native-webview';

export const useOTP = () => {
    const router = useRouter();
    const captchaRef = useRef<Hcaptcha>(null);
    const hCaptchasiteKey = process.env.HCAPTCHA_SITE_KEY || 'YOUR_SITE_KEY_HERE';

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nic, setNic] = useState('');
    const [birth, setBirth] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    

    const [phone, setPhone] = useState('+94');
    const [otp, setOtp] = useState('');
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [otpStep, setOtpStep] = useState(1);

    const handleSendOTP = () => {
        captchaRef.current?.show(); 
    };

    const onCaptchaSuccess = async (event: WebViewMessageEvent) => {
        if (event && event.nativeEvent.data) {
            if (['cancel', 'error', 'expired'].includes(event.nativeEvent.data)) return;
            
            const captchaToken = event.nativeEvent.data;
            const { error } = await supabase.auth.signInWithOtp({
                phone: phone,
                options: { captchaToken }
            });

            if (error) {
                Alert.alert("Error sending OTP", error.message);
            } else {
                setOtpStep(2);
            }
        }
    };

    const handleVerifyOTP = async () => {
        const { error } = await supabase.auth.verifyOtp({
            phone,
            token: otp,
            type: 'sms',
        });

        if (error) {
            Alert.alert("Error", "Invalid OTP. " + error.message);
        } else {
            Alert.alert("Success", "Phone verified successfully!");
            setIsPhoneVerified(true);
            setModalVisible(false);
        }
    }

    return {
        phone, setPhone,
        otp, setOtp,
        isPhoneVerified,
        isModalVisible, setModalVisible,
        otpStep, setOtpStep,
        
        captchaRef,
        hCaptchasiteKey,

        handleSendOTP,
        onCaptchaSuccess,
        handleVerifyOTP,
        // signUpAcc

  }

}