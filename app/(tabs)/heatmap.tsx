import React, { useEffect, useState } from 'react';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import MapView, { Circle } from 'react-native-maps';
import { useTheme } from '../themeContext';

// I added this part so when the map is opened it will open over Sri Lanka
const currentLocation = {
    latitude: 6.8905,
    longitude: 79.8565,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

export default function Heatmap() {
  const { theme } = useTheme();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    // this is to Fetch the different ratings of places
    fetch('https://placeholder.com/reports')  // have to fetch from reports table
        .then(res => res.json())
        .then(data => {
            if (data && data.features) {
                setReports(data.features);
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
  }, []);

  // this function helps decide circle color based on different types of reports
  const getCircleColor = (mag: number) => {
    if (mag > 5) return 'rgba(178,24,43,0.8)';
    if (mag > 4) return 'rgba(239,138,98,0.8)';
    if (mag > 3) return 'rgba(253,219,199,0.8)';
    if (mag > 2) return 'rgba(209,229,240,0.8)';
    return 'rgba(103,169,207,0.8)';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <MapView
        style={styles.map}
        initialRegion={currentLocation}
      >
        {/* Map rendering and circles will go here */}
      </MapView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

