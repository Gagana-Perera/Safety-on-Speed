import { supabase } from '@/lib/superbase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

export const useSignUpLogic = () => {
    const router = useRouter();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nic, setNic] = useState('');
    const [birth, setBirth] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [phone, setPhone] = useState('+94');

    const signUpAcc = async () => {
        setLoading(true);

        if (email !== confirmEmail) {
            Alert.alert("Mismatch", "Email and Confirm Email must be equal");
            setLoading(false);
            return;
        }

        if (!email || !password || !firstName || !lastName || !nic || !phone) {
            Alert.alert("Missing Information", "Please fill in all required fields.");
            setLoading(false);
            return;
        }
        
            const { error: dbError } = await supabase.auth.signUp({
                email: email,
                password: password,
                phone: phone, 
                options: {
                    data: {
                    first_name: firstName,
                    last_name: lastName,
                    nic: nic,
                    birth_date: birth,
                    contact_phone: phone 
                    }
                }
            });

            if (dbError) {
                console.log("dbError" + dbError.message);
                Alert.alert("Database Error", dbError.message);
            } else {
                router.replace("/(tabs)/profile");
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