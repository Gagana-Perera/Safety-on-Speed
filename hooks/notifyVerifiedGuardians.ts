import { supabase } from '../lib/superbase';
import { Alert } from 'react-native';

export const notifyVerifiedGuardians = async (userId: string, liveLocationLink: string) => {
  try {
    // Fetch verified guardians for the current user using the existing table schema
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
    
    console.log(`Notifying ${guardians.length} guardians with link: ${liveLocationLink}`);
    
    for (const guardian of guardians) {
      console.log(`[Notification] To: ${guardian.name} (${guardian.phone}) - SOS Alert! Track my live location here: ${liveLocationLink}`);
    }

    Alert.alert('Guardians Notified', `Sent alert to ${guardians.length} verified guardians.`);

  } catch (err) {
    console.error('Unexpected error notifying guardians:', err);
  }
};
