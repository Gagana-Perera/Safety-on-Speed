import { useOTP } from '@/hooks/otp-db';
import Hcaptcha from '@hcaptcha/react-native-hcaptcha';
import React from 'react';
import { Button, Text, TextInput, View } from 'react-native';

export default function Otp() {

    const {
            otp, setOtp,
            isPhoneVerified,
            otpStep, setOtpStep,
            captchaRef,
            hCaptchasiteKey,
            handleSendOTP,
            onCaptchaSuccess,
            handleVerifyOTP,
            // signUpAcc
        } = useOTP();

  return (
    <View>
        <View className='flex-1 justify-center items-center bg-black/50'>
                    <View className="w-10/12 bg-white p-6 rounded-2xl shadow-lg">
                        <Text className="text-xl font-bold mb-4 text-center text-gray-800">
                            {otpStep === 1 ? "Verify Phone Number" : "Enter Verification Code"}
                        </Text>

                        {otpStep === 1 ? (
                            <>
                                {/* <Text className="text-center text-gray-600 mb-6">We will send an OTP to {phone}</Text> */}
                                <View className="flex-row justify-between mt-2">
                                    {/* <Button title="Cancel" color="red" onPress={() => setModalVisible(false)} /> */}
                                    <Button title="Send OTP" onPress={handleSendOTP} />
                                </View>

                                <Hcaptcha
                                    ref={captchaRef}
                                    siteKey={hCaptchasiteKey}
                                    baseUrl="http://localhost"
                                    languageCode="en"
                                    onMessage={onCaptchaSuccess}
                                    size="normal"
                                />
                                
                            </>
                        ) : (
                            <>.
                                <TextInput
                                    placeholder="Enter 6-digit OTP" 
                                    value={otp} 
                                    onChangeText={setOtp} 
                                    keyboardType="numeric"
                                />
                                <View className='flex-row justify-between'>
                                    <Button title="Back" color="gray" onPress={() => setOtpStep(1)} />
                                    <Button title="Verify" onPress={handleVerifyOTP} />
                                </View>
                            </>
                        )}
                    </View>
                </View>
    </View>
  )
}