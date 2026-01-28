import { useCaptcha } from "@/hooks/captcha-db";
import { useOTP } from "@/hooks/otp-db";
import React from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import Captcha from './captcha';

export default function Otp() {
    const {
        otpPhone, setOtpPhone,
        otp, setOtp,
        otpStep, setOtpStep,
        sendOtp,
        verifyOtp
    } = useOTP();

    const handleCaptchaSuccess = (token: string) => {
        sendOtp(token);
    };

    const { 
        captchaRef, 
        hCaptchasiteKey, 
        showCaptcha, 
        onCaptchaMessage 
    } = useCaptcha(handleCaptchaSuccess);

    return (
        <View>
            {/* BELOW PART IS AI. I AM DOING BACKEND NOW NOT FRONT-END - Rivindu */}
            <View className='flex-1 justify-center items-center bg-black/50'>
                <View className="w-10/12 bg-white p-6 rounded-2xl shadow-lg">
                    <Text className="text-xl font-bold mb-4 text-center text-gray-800">
                        {otpStep === 1 ? "Verify Phone Number" : "Enter Verification Code"}
                    </Text>

                    {otpStep === 1 ? (
                        <>
                            <View className="flex-row justify-between mt-2">
                                <Button title="Send OTP" onPress={showCaptcha} />
                            </View>

                            <Captcha
                                captchaRef={captchaRef}
                                siteKey={hCaptchasiteKey}
                                onMessage={onCaptchaMessage}
                            />
                        </>
                    ) : (
                        <>
                            <TextInput
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="numeric"
                            />
                            <View className='flex-row justify-between'>
                                <Button title="Back" color="gray" onPress={() => setOtpStep(1)} />
                                <Button title="Verify" onPress={verifyOtp} />
                            </View>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
}