import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

interface BackButtonProps {
  color?: string;
  size?: number;
  onPress?: () => void;
}

export default function BackButton({
  color = "#fff",
  size = 24,
  onPress,
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      style={styles.backButton}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Feather name="arrow-left" size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
  },
});
