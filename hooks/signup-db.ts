import { supabase } from '@/lib/superbase';
// import Hcaptcha from '@hcaptcha/react-native-hcaptcha';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

export const useSignUpLogic = () => {
    const router = useRouter();
    // const captchaRef = useRef<Hcaptcha>(null);
    // const hCaptchasiteKey = process.env.HCAPTCHA_SITE_KEY';

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nic, setNic] = useState('');
    const [birth, setBirth] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [phone, setPhone] = useState('+94');
    // const [otp, setOtp] = useState('');
    // const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    // const [isModalVisible, setModalVisible] = useState(false);
    // const [otpStep, setOtpStep] = useState(1);

    // --- Functions ---

    // {const handleSendOTP = () => {
    //     captchaRef.current?.show(); 
    // };

    // const onCaptchaSuccess = async (event: WebViewMessageEvent) => {
    //     if (event && event.nativeEvent.data) {
    //         if (['cancel', 'error', 'expired'].includes(event.nativeEvent.data)) return;
            
    //         const captchaToken = event.nativeEvent.data;
    //         const { error } = await supabase.auth.signInWithOtp({
    //             phone: phone,
    //             options: { captchaToken }
    //         });

    //         if (error) {
    //             Alert.alert("Error sending OTP", error.message);
    //         } else {
    //             setOtpStep(2);
    //         }
    //     }
    // };

    // const handleVerifyOTP = async () => {
    //     const { error } = await supabase.auth.verifyOtp({
    //         phone,
    //         token: otp,
    //         type: 'sms',
    //     });

    //     if (error) {
    //         Alert.alert("Error", "Invalid OTP. " + error.message);
    //     } else {
    //         Alert.alert("Success", "Phone verified successfully!");
    //         setIsPhoneVerified(true);
    //         setModalVisible(false);
    //     }
    // };}

    const signUpAcc = async () => {
        setLoading(true);

        if (email !== confirmEmail) {
            Alert.alert("Mismatch", "Email and Confirm Email must be equal");
            setLoading(false);
            return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({ 
            email, 
            password, 
            options: { 
                data: { firstName, lastName, nic, birth, 
                    // phone
                 } 
            } 
        });

        if (authError) {
            Alert.alert("Sign Up Error", authError.message);
            setLoading(false);
            return;
        }

        if (authData.user) {
            const { error: dbError } = await supabase.from('userpeople').insert([{
                id: authData.user.id,
                firstName,
                lastName,
                nic,
                birth,
                confirmEmail,
                email,
                password: password, 
                phone
            }]);

            if (dbError) {
                console.log("dbError" + dbError.message);
                Alert.alert("Database Error", dbError.message);
            } else {
                router.replace("/auth/otp");
            }
        }
        setLoading(false);


        
    };

    return {
        firstName, setFirstName,
        lastName, setLastName,
        nic, setNic,
        birth, setBirth,
        email, setEmail,
        confirmEmail, setConfirmEmail,
        password, setPassword,
        loading,
        phone, setPhone,
        signUpAcc
    };
};