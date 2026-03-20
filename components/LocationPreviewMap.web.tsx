import { StyleSheet, View } from "react-native";

export default function LocationPreviewMap() {
  // react-native-maps isn't supported on web in this project.
  // The permission preprompt is only shown on native.
  return <View style={styles.placeholder} />;
}

const styles = StyleSheet.create({
  placeholder: {
    height: 190,
    width: "100%",
  },
});
