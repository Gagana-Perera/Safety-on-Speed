import { StyleSheet, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";

type Props = {
  region?: Region;
};

const DEFAULT_REGION: Region = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export default function LocationPreviewMap({ region }: Props) {
  const resolvedRegion = region ?? DEFAULT_REGION;

  return (
    <View style={styles.wrap}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={resolvedRegion}
        pointerEvents="none"
      >
        <Marker
          coordinate={{
            latitude: resolvedRegion.latitude,
            longitude: resolvedRegion.longitude,
          }}
        >
          <View style={styles.dotOuter}>
            <View style={styles.dotInner} />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 120,
    width: "100%",
  },
  dotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  dotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563eb",
  },
});
