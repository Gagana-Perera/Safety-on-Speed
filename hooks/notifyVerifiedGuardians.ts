import { supabase } from '../lib/superbase';
import { Alert } from 'react-native';

export const notifyVerifiedGuardians = async (userId: string, liveLocationLink: string) => {
  try {
    // 1. Check if user has alert notifications enabled
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('alert_notif')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }

    // 2. Stop if alert notifications are disabled
    if (!profile?.alert_notif) {
      console.log('Alert notifications disabled by user.');
      return;
    }

    // 3. Fetch verified guardians
    const { data, error } = await supabase
      .from('guardians')
      .select('g1_name, g1_phone, g2_name, g2_phone, g3_name, g3_phone, g4_name, g4_phone, g5_name, g5_phone')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching guardians:', error);
      return;
    }

    const guardians: { name: string; phone: string }[] = [];

    for (let i = 1; i <= 5; i++) {
      const name = (data as any)[`g${i}_name`];
      const phone = (data as any)[`g${i}_phone`];

      if (name && phone) {
        guardians.push({ name, phone });
      }
    }

    if (guardians.length === 0) {
      console.log('No verified guardians found to notify.');
      return;
    }

    // 4. Send SMS to each guardian
    for (const guardian of guardians) {
      await supabase.functions.invoke('send-sos-sms', {
        body: {
          phone: guardian.phone,
          message: `SOS Alert! Someone needs help! Track live location: ${liveLocationLink}`
        }
      });
      console.log(`SMS sent to ${guardian.name} (${guardian.phone})`);
    }

    Alert.alert('Guardians Notified', `Sent alert to ${guardians.length} verified guardians.`);

  } catch (err) {
    console.error('Unexpected error notifying guardians:', err);
  }
};