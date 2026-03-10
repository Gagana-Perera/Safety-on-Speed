import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  LatLng,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "../../constants/icons";
import {
  autocompletePlaces,
  findNearestPlaceAt,
  getPlaceDetails,
  getPlacePhotoUrl,
  NearbyPlace,
  PlaceDetails,
  PlaceSuggestion,
  searchNearbyPlaces,
} from "../../services/GooglePlacesService";
import { useTheme } from "../themeContext";

// Map tab:
// - Search + autocomplete
// - POI category chips (police/hospital/pharmacy/etc.)
// - Two bottom sheets:
//   1) Nearby places list
//   2) Selected place details (photos, actions, reviews)
//
// This file is intentionally "state heavy" because it coordinates map gestures,
// Places API calls, and bottom-sheet snap/scroll interactions.

type Coords = { latitude: number; longitude: number };

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const LEGIBLE_SANS_FONT_FAMILY = Platform.select({
  android: "sans-serif",
  ios: undefined,
});

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// Shortens large counts for UI (e.g. 12500 -> 12.5K).
const formatCount = (n?: number) => {
  if (typeof n !== "number") return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

// Fisher–Yates shuffle.
// Used so POI results can be randomized by default (distance sorting is optional via UI).
const shuffleArray = <T,>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
};

const estimateStarCountsMaxEntropy = (
  averageRating: number,
  totalReviews: number,
): number[] => {
  // Places Details does NOT provide the full star histogram.
  // When we only have (averageRating, totalReviews), we approximate a plausible
  // 1..5 distribution via a maximum-entropy model that matches the average.
  const total = Math.max(0, Math.floor(totalReviews));
  if (!total) return [0, 0, 0, 0, 0];

  const mu = clamp(averageRating, 1, 5);
  const stars = [1, 2, 3, 4, 5] as const;

  const expectedForLambda = (lambda: number) => {
    const weights = stars.map((s) => Math.exp(lambda * s));
    const sumW = weights.reduce((a, b) => a + b, 0);
    const sumSW = weights.reduce((a, w, idx) => a + w * stars[idx], 0);
    return sumSW / sumW;
  };

  let lo = -10;
  let hi = 10;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const e = expectedForLambda(mid);
    if (e < mu) lo = mid;
    else hi = mid;
  }
  const lambda = (lo + hi) / 2;

  const rawWeights = stars.map((s) => Math.exp(lambda * s));
  const sumW = rawWeights.reduce((a, b) => a + b, 0);
  const p = rawWeights.map((w) => w / sumW);

  const floors = p.map((x) => Math.floor(x * total));
  let remaining = total - floors.reduce((a, b) => a + b, 0);

  const frac = p.map((x, i) => ({
    i,
    f: x * total - floors[i],
  }));
  frac.sort((a, b) => b.f - a.f);
  for (let k = 0; k < frac.length && remaining > 0; k += 1) {
    floors[frac[k].i] += 1;
    remaining -= 1;
  }

  return floors;
};

export default function MapScreen() {
  const params = useLocalSearchParams<{
    placeId?: string | string[];
    t?: string | string[];
    poi?: string | string[];
  }>();
  const router = useRouter();
  const { isDark, theme } = useTheme();

  const SRI_LANKA_CENTER = { latitude: 7.8731, longitude: 80.7718 };

  const mapRef = useRef<MapView | null>(null);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  const [coords, setCoords] = useState<Coords>(SRI_LANKA_CENTER);
  const [coordsAccuracyM, setCoordsAccuracyM] = useState<number | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: SRI_LANKA_CENTER.latitude,
    longitude: SRI_LANKA_CENTER.longitude,
    latitudeDelta: 2.5,
    longitudeDelta: 2.5,
  });

  const [loading, setLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [autoLoading, setAutoLoading] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);

  // Review summary model for the selected-place sheet.
  // - If the API provided a small review sample, we can build a sample histogram.
  // - If we also have userRatingsTotal + average rating, we can show an estimated
  //   histogram that scales to the full review count.
  const selectedReviewSummary = useMemo(() => {
    const rating =
      selectedPlace && typeof selectedPlace.rating === "number"
        ? selectedPlace.rating
        : null;

    const totalReviews =
      selectedPlace && typeof selectedPlace.userRatingsTotal === "number"
        ? selectedPlace.userRatingsTotal
        : null;

    const raw = Array.isArray(selectedPlace?.reviews)
      ? selectedPlace?.reviews
      : [];

    const sampleCounts = [0, 0, 0, 0, 0]; // 1..5
    for (const r of raw) {
      const v = typeof r?.rating === "number" ? r.rating : null;
      if (v === null) continue;
      const bucket = clamp(Math.round(v), 1, 5);
      sampleCounts[bucket - 1] += 1;
    }

    const sampleTotal = sampleCounts.reduce((a, b) => a + b, 0);

    const useEstimated =
      rating !== null &&
      totalReviews !== null &&
      Number.isFinite(rating) &&
      Number.isFinite(totalReviews) &&
      totalReviews > 0;

    const counts = useEstimated
      ? estimateStarCountsMaxEntropy(rating, totalReviews)
      : sampleCounts;

    const denom = counts.reduce((a, b) => a + b, 0);
    const pct = (star: 1 | 2 | 3 | 4 | 5) => {
      if (!denom) return 0;
      return counts[star - 1] / denom;
    };

    return {
      rating,
      totalText:
        totalReviews !== null
          ? formatCount(totalReviews)
          : sampleTotal
            ? String(sampleTotal)
            : "",
      source: useEstimated ? ("estimated" as const) : ("sample" as const),
      usedCount: denom,
      pct,
    };
  }, [selectedPlace]);

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLoadingPlaceId, setNearbyLoadingPlaceId] = useState<
    string | null
  >(null);
  const [poiLoading, setPoiLoading] = useState(false);
  const [activePoiKey, setActivePoiKey] = useState<string | null>(null);
  const [poiPressedKey, setPoiPressedKey] = useState<string | null>(null);

  // POI list controls.
  // Default behavior is randomized results; user can switch to distance sorting.
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterWheelchair, setFilterWheelchair] = useState(false);
  const [sortMode, setSortMode] = useState<"default" | "distance">("default");

  const attemptedOpenNowRef = useRef<Set<string>>(new Set());
  const [openNowHydrating, setOpenNowHydrating] = useState(false);

  const attemptedWheelchairRef = useRef<Set<string>>(new Set());
  const [wheelchairHydrating, setWheelchairHydrating] = useState(false);

  const [nearbySheetExpanded, setNearbySheetExpanded] = useState(false);
  const [nearbySheetChipsOnly, setNearbySheetChipsOnly] = useState(false);

  const [meMarkerTracksViewChanges, setMeMarkerTracksViewChanges] =
    useState(true);

  const [poiMarkerTracksViewChanges, setPoiMarkerTracksViewChanges] =
    useState(true);

  // Selected-place sheet state.
  // Expanded: user is reading details and can scroll.
  // Minimized: extra collapsed state ("second touch") for more map visibility.
  const [selectedSheetExpanded, setSelectedSheetExpanded] = useState(false);
  const [selectedSheetMinimized, setSelectedSheetMinimized] = useState(false);

  const [selectedSheetHeaderHeight, setSelectedSheetHeaderHeight] = useState(0);
  const [selectedSheetBodyHeight, setSelectedSheetBodyHeight] = useState(0);
  const [selectedSheetDragZoneHeight, setSelectedSheetDragZoneHeight] =
    useState(0);

  const [nearbyDragZoneHeight, setNearbyDragZoneHeight] = useState(0);
  const [nearbyFilterRowHeight, setNearbyFilterRowHeight] = useState(0);
  const [topOverlayBottomY, setTopOverlayBottomY] = useState(0);

  const nearbyListScrollYRef = useRef(0);

  const selectedSheetScrollYRef = useRef(0);

  const nearbySheetTranslateY = useRef(new Animated.Value(0)).current;
  const nearbySheetTranslateYRef = useRef(0);
  const wasNearbySheetVisibleRef = useRef(false);
  const nearbySheetPanStartRef = useRef(0);
  const nearbySheetDraggingRef = useRef(false);

  const nearbySheetExpandedRef = useRef(false);
  const nearbySheetChipsOnlyRef = useRef(false);

  const selectedSheetTranslateY = useRef(new Animated.Value(0)).current;
  const selectedSheetTranslateYRef = useRef(0);
  const wasSelectedSheetVisibleRef = useRef(false);
  const selectedSheetPanStartRef = useRef(0);
  const selectedSheetDraggingRef = useRef(false);

  const selectedSheetExpandedRef = useRef(false);

  const {
    selectedSheetHeightPx,
    selectedSheetExpandedTranslate,
    selectedSheetCollapsedTranslate,
    selectedSheetMinimizedTranslate,
    selectedSheetHasMinimizedSnap,
  } = useMemo(() => {
    const h = dimensions.height || Dimensions.get("window").height;
    const sheetHeightPx = Math.round(h * 0.95);
    const defaultPeekVisiblePx = Math.round(h * 0.4);
    const minPeekVisiblePx = 220;
    const totalContentHeight =
      selectedSheetHeaderHeight + selectedSheetBodyHeight;

    const contentPeekVisiblePx = totalContentHeight
      ? clamp(totalContentHeight + 64, minPeekVisiblePx, defaultPeekVisiblePx)
      : defaultPeekVisiblePx;
    const peekVisiblePx = contentPeekVisiblePx;
    const collapsedTranslate = Math.max(0, sheetHeightPx - peekVisiblePx);

    const overlayMargin = 10;
    const minTop = Math.max(0, topOverlayBottomY + overlayMargin);
    const baseTop = h - sheetHeightPx;
    const expandedTranslate = clamp(minTop - baseTop, 0, collapsedTranslate);

    // Minimized: show just the handle + heading (for more map visibility).
    const sheetPaddingPx = 16; // matches styles.nearbySheet.padding
    const dragH = selectedSheetDragZoneHeight || 24;
    const headerH = selectedSheetHeaderHeight || 56;
    const minimizedVisiblePx = Math.round(
      sheetPaddingPx + dragH + headerH + 10,
    );
    const minimizedTranslateRaw = Math.max(
      0,
      sheetHeightPx - minimizedVisiblePx,
    );
    const minimizedTranslate = Math.max(
      collapsedTranslate,
      minimizedTranslateRaw,
    );
    const hasMinimizedSnap = minimizedTranslate > collapsedTranslate + 4;

    return {
      selectedSheetHeightPx: sheetHeightPx,
      selectedSheetExpandedTranslate: expandedTranslate,
      selectedSheetCollapsedTranslate: collapsedTranslate,
      selectedSheetMinimizedTranslate: minimizedTranslate,
      selectedSheetHasMinimizedSnap: hasMinimizedSnap,
    };
  }, [
    dimensions.height,
    topOverlayBottomY,
    selectedSheetBodyHeight,
    selectedSheetDragZoneHeight,
    selectedSheetHeaderHeight,
  ]);

  const updateSelectedSheetModeFromTranslate = useCallback(
    (translateY: number) => {
      const isExpanded = translateY <= selectedSheetExpandedTranslate + 0.5;
      const isMinimized =
        selectedSheetHasMinimizedSnap &&
        translateY >= selectedSheetMinimizedTranslate - 8;

      if (selectedSheetExpandedRef.current !== isExpanded) {
        selectedSheetExpandedRef.current = isExpanded;
        setSelectedSheetExpanded(isExpanded);
      }

      if (isMinimized !== selectedSheetMinimized) {
        setSelectedSheetMinimized(isMinimized);
      }
    },
    [
      selectedSheetExpandedTranslate,
      selectedSheetHasMinimizedSnap,
      selectedSheetMinimizedTranslate,
      selectedSheetMinimized,
    ],
  );

  const animateSelectedSheetTo = useCallback(
    (toValue: number) => {
      updateSelectedSheetModeFromTranslate(toValue);
      Animated.timing(selectedSheetTranslateY, {
        toValue,
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1.0),
        useNativeDriver: true,
      }).start(() => {
        selectedSheetTranslateYRef.current = toValue;
        updateSelectedSheetModeFromTranslate(toValue);
      });
    },
    [selectedSheetTranslateY, updateSelectedSheetModeFromTranslate],
  );

  useEffect(() => {
    if (!selectedPlace) return;
    if (selectedSheetDraggingRef.current) return;

    if (selectedSheetMinimized) {
      animateSelectedSheetTo(selectedSheetMinimizedTranslate);
      return;
    }

    const current = selectedSheetTranslateYRef.current;
    const isExpanded = current <= selectedSheetExpandedTranslate + 0.5;
    animateSelectedSheetTo(
      isExpanded
        ? selectedSheetExpandedTranslate
        : selectedSheetCollapsedTranslate,
    );
  }, [
    selectedPlace,
    selectedSheetCollapsedTranslate,
    selectedSheetExpandedTranslate,
    selectedSheetMinimizedTranslate,
    selectedSheetMinimized,
    animateSelectedSheetTo,
  ]);

  const selectedSheetPanResponder = useMemo(() => {
    const shouldSet = (_: unknown, g: { dx: number; dy: number }) => {
      const vertical = Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx);
      if (!vertical) return false;

      const isExpanded =
        selectedSheetTranslateYRef.current <=
        selectedSheetExpandedTranslate + 0.5;
      if (!isExpanded) return true;

      const listAtTop = selectedSheetScrollYRef.current <= 0;
      return listAtTop && g.dy > 0;
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: shouldSet,
      onMoveShouldSetPanResponderCapture: shouldSet,
      onPanResponderGrant: () => {
        selectedSheetDraggingRef.current = true;
        selectedSheetPanStartRef.current = selectedSheetTranslateYRef.current;
      },
      onPanResponderMove: (_, g) => {
        if (!selectedSheetCollapsedTranslate) return;
        const maxTranslate = selectedSheetHasMinimizedSnap
          ? selectedSheetMinimizedTranslate
          : selectedSheetCollapsedTranslate;
        const next = clamp(
          selectedSheetPanStartRef.current + g.dy,
          selectedSheetExpandedTranslate,
          maxTranslate,
        );
        selectedSheetTranslateY.setValue(next);
        selectedSheetTranslateYRef.current = next;
        updateSelectedSheetModeFromTranslate(next);
      },
      onPanResponderRelease: (_, g) => {
        selectedSheetDraggingRef.current = false;
        if (!selectedSheetCollapsedTranslate) return;
        const current = selectedSheetTranslateYRef.current;
        const vy = g.vy;

        const snapPoints = selectedSheetHasMinimizedSnap
          ? [
              selectedSheetExpandedTranslate,
              selectedSheetCollapsedTranslate,
              selectedSheetMinimizedTranslate,
            ]
          : [selectedSheetExpandedTranslate, selectedSheetCollapsedTranslate];

        const nearest = snapPoints.reduce(
          (best, p) =>
            Math.abs(p - current) < Math.abs(best - current) ? p : best,
          snapPoints[0],
        );

        if (vy <= -0.8) {
          if (!selectedSheetHasMinimizedSnap) {
            animateSelectedSheetTo(selectedSheetExpandedTranslate);
            return;
          }

          const isAtPeek =
            Math.abs(current - selectedSheetCollapsedTranslate) <= 14;
          const isAtMin =
            Math.abs(current - selectedSheetMinimizedTranslate) <= 18;

          // Swipe-up: minimized -> peek -> expanded.
          if (isAtMin || current > selectedSheetCollapsedTranslate) {
            animateSelectedSheetTo(selectedSheetCollapsedTranslate);
            return;
          }

          if (isAtPeek || current <= selectedSheetCollapsedTranslate) {
            animateSelectedSheetTo(selectedSheetExpandedTranslate);
            return;
          }

          animateSelectedSheetTo(nearest);
          return;
        }
        if (vy >= 0.8) {
          if (!selectedSheetHasMinimizedSnap) {
            animateSelectedSheetTo(selectedSheetCollapsedTranslate);
            return;
          }

          const isExpanded = current <= selectedSheetExpandedTranslate + 0.5;
          const isAtPeek =
            Math.abs(current - selectedSheetCollapsedTranslate) <= 14;

          if (isExpanded) {
            animateSelectedSheetTo(selectedSheetCollapsedTranslate);
            return;
          }

          if (isAtPeek) {
            animateSelectedSheetTo(selectedSheetMinimizedTranslate);
            return;
          }

          const mid =
            selectedSheetCollapsedTranslate +
            (selectedSheetMinimizedTranslate -
              selectedSheetCollapsedTranslate) /
              2;
          animateSelectedSheetTo(
            current >= mid
              ? selectedSheetMinimizedTranslate
              : selectedSheetCollapsedTranslate,
          );
          return;
        }

        animateSelectedSheetTo(nearest);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        selectedSheetDraggingRef.current = false;
        if (!selectedSheetCollapsedTranslate) return;
        const current = selectedSheetTranslateYRef.current;

        const snapPoints = selectedSheetHasMinimizedSnap
          ? [
              selectedSheetExpandedTranslate,
              selectedSheetCollapsedTranslate,
              selectedSheetMinimizedTranslate,
            ]
          : [selectedSheetExpandedTranslate, selectedSheetCollapsedTranslate];
        const nearest = snapPoints.reduce(
          (best, p) =>
            Math.abs(p - current) < Math.abs(best - current) ? p : best,
          snapPoints[0],
        );
        animateSelectedSheetTo(nearest);
      },
    });
  }, [
    animateSelectedSheetTo,
    selectedSheetCollapsedTranslate,
    selectedSheetExpandedTranslate,
    selectedSheetHasMinimizedSnap,
    selectedSheetMinimizedTranslate,
    selectedSheetTranslateY,
    updateSelectedSheetModeFromTranslate,
  ]);

  // Bottom-sheet snap points (Google Maps style):
  // - Peek: 40% visible (map remains visible behind)
  // - Expanded: 95% height
  const {
    nearbySheetHeightPx,
    nearbySheetExpandedTranslate,
    nearbySheetCollapsedTranslate,
    nearbySheetChipsOnlyTranslate,
    nearbySheetHasChipsOnlySnap,
  } = useMemo(() => {
    const h = dimensions.height || Dimensions.get("window").height;
    const sheetHeightPx = Math.round(h * 0.95);

    // Chips-only needs enough room to keep the handle + filter chips visible.
    // If Peek is smaller than that, the chips-only snap collapses into Peek and
    // the sheet can feel like it "stops halfway".
    const sheetPaddingPx = 16; // matches styles.nearbySheet.padding
    const dragH = nearbyDragZoneHeight || 24;
    const chipsH = nearbyFilterRowHeight || 56;
    const chipsOnlyCushionPx = 22;
    const chipsOnlyNeededVisiblePx = Math.round(
      sheetPaddingPx + dragH + chipsH + chipsOnlyCushionPx,
    );

    const minPeekVisiblePx = chipsOnlyNeededVisiblePx + 60;
    const peekVisiblePx = Math.max(Math.round(h * 0.4), minPeekVisiblePx);
    const collapsedTranslate = Math.max(0, sheetHeightPx - peekVisiblePx);

    // Expanded should not cover the search bar/top overlay.
    // translateY moves the sheet DOWN (larger = lower). Sheet top is:
    //   top = h - sheetHeightPx + translateY
    // So to keep the top below the overlay bottom:
    //   translateY >= overlayBottom + margin - (h - sheetHeightPx)
    const overlayMargin = 10;
    const minTop = Math.max(0, topOverlayBottomY + overlayMargin);
    const baseTop = h - sheetHeightPx;
    const expandedTranslate = clamp(minTop - baseTop, 0, collapsedTranslate);

    // Chips-only: show just the drag handle + filter chips row.
    const chipsOnlyTranslate = Math.max(
      0,
      sheetHeightPx - chipsOnlyNeededVisiblePx,
    );
    const hasChipsOnlySnap = chipsOnlyTranslate > collapsedTranslate + 4;

    return {
      nearbySheetHeightPx: sheetHeightPx,
      nearbySheetExpandedTranslate: expandedTranslate,
      nearbySheetCollapsedTranslate: collapsedTranslate,
      nearbySheetChipsOnlyTranslate: chipsOnlyTranslate,
      nearbySheetHasChipsOnlySnap: hasChipsOnlySnap,
    };
  }, [
    dimensions.height,
    nearbyDragZoneHeight,
    nearbyFilterRowHeight,
    topOverlayBottomY,
  ]);

  const updateNearbySheetModeFromTranslate = useCallback(
    (translateY: number) => {
      const isExpanded = translateY <= nearbySheetExpandedTranslate + 0.5;
      const isChipsOnly =
        nearbySheetHasChipsOnlySnap &&
        translateY >= nearbySheetChipsOnlyTranslate - 8;

      if (nearbySheetExpandedRef.current !== isExpanded) {
        nearbySheetExpandedRef.current = isExpanded;
        setNearbySheetExpanded(isExpanded);
      }

      if (nearbySheetChipsOnlyRef.current !== isChipsOnly) {
        nearbySheetChipsOnlyRef.current = isChipsOnly;
        setNearbySheetChipsOnly(isChipsOnly);
      }
    },
    [
      nearbySheetChipsOnlyTranslate,
      nearbySheetExpandedTranslate,
      nearbySheetHasChipsOnlySnap,
    ],
  );

  const animateNearbySheetTo = useCallback(
    (toValue: number) => {
      // Update UI immediately so content doesn't "appear late" after snapping.
      updateNearbySheetModeFromTranslate(toValue);
      Animated.timing(nearbySheetTranslateY, {
        toValue,
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1.0),
        useNativeDriver: true,
      }).start(() => {
        nearbySheetTranslateYRef.current = toValue;
        updateNearbySheetModeFromTranslate(toValue);
      });
    },
    [nearbySheetTranslateY, updateNearbySheetModeFromTranslate],
  );

  const nearbySheetPanResponder = useMemo(() => {
    const shouldSet = (_: unknown, g: { dx: number; dy: number }) => {
      const vertical = Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx);
      return vertical;
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: shouldSet,
      onMoveShouldSetPanResponderCapture: shouldSet,
      onPanResponderGrant: () => {
        nearbySheetDraggingRef.current = true;
        nearbySheetPanStartRef.current = nearbySheetTranslateYRef.current;
      },
      onPanResponderMove: (_, g) => {
        if (!nearbySheetCollapsedTranslate) return;
        const next = clamp(
          nearbySheetPanStartRef.current + g.dy,
          nearbySheetExpandedTranslate,
          nearbySheetHasChipsOnlySnap
            ? nearbySheetChipsOnlyTranslate
            : nearbySheetCollapsedTranslate,
        );
        nearbySheetTranslateY.setValue(next);
        nearbySheetTranslateYRef.current = next;

        // Keep the content visibility in sync while dragging.
        updateNearbySheetModeFromTranslate(next);
      },
      onPanResponderRelease: (_, g) => {
        nearbySheetDraggingRef.current = false;
        if (!nearbySheetCollapsedTranslate) return;

        const current = nearbySheetTranslateYRef.current;
        const vy = g.vy;

        const snapPoints = nearbySheetHasChipsOnlySnap
          ? [
              nearbySheetExpandedTranslate,
              nearbySheetCollapsedTranslate,
              nearbySheetChipsOnlyTranslate,
            ]
          : [nearbySheetExpandedTranslate, nearbySheetCollapsedTranslate];

        const nearest = snapPoints.reduce(
          (best, p) =>
            Math.abs(p - current) < Math.abs(best - current) ? p : best,
          snapPoints[0],
        );

        if (vy <= -0.8) {
          if (!nearbySheetHasChipsOnlySnap) {
            animateNearbySheetTo(nearbySheetExpandedTranslate);
            return;
          }

          const isAtPeek =
            Math.abs(current - nearbySheetCollapsedTranslate) <= 14;
          const isAtChipsOnly =
            Math.abs(current - nearbySheetChipsOnlyTranslate) <= 18;

          // Swipe-up should not "over-scroll":
          // chips-only -> Peek -> Expanded.
          if (isAtChipsOnly || current > nearbySheetCollapsedTranslate) {
            animateNearbySheetTo(nearbySheetCollapsedTranslate);
            return;
          }

          if (isAtPeek || current <= nearbySheetCollapsedTranslate) {
            animateNearbySheetTo(nearbySheetExpandedTranslate);
            return;
          }

          animateNearbySheetTo(nearest);
          return;
        }

        if (vy >= 0.8) {
          if (!nearbySheetHasChipsOnlySnap) {
            animateNearbySheetTo(nearbySheetCollapsedTranslate);
            return;
          }

          const isExpanded = current <= nearbySheetExpandedTranslate + 0.5;
          const isAtPeek =
            Math.abs(current - nearbySheetCollapsedTranslate) <= 14;

          // First swipe-down from Expanded -> Peek.
          if (isExpanded) {
            animateNearbySheetTo(nearbySheetCollapsedTranslate);
            return;
          }

          // Second swipe-down from Peek -> Chips-only.
          if (isAtPeek) {
            animateNearbySheetTo(nearbySheetChipsOnlyTranslate);
            return;
          }

          // Otherwise, snap toward the nearer downward stop.
          const mid =
            nearbySheetCollapsedTranslate +
            (nearbySheetChipsOnlyTranslate - nearbySheetCollapsedTranslate) / 2;
          animateNearbySheetTo(
            current >= mid
              ? nearbySheetChipsOnlyTranslate
              : nearbySheetCollapsedTranslate,
          );
          return;
        }

        animateNearbySheetTo(nearest);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        nearbySheetDraggingRef.current = false;
        // Snap back to the nearest position if the gesture is interrupted.
        if (!nearbySheetCollapsedTranslate) return;
        const current = nearbySheetTranslateYRef.current;
        const snapPoints = nearbySheetHasChipsOnlySnap
          ? [
              nearbySheetExpandedTranslate,
              nearbySheetCollapsedTranslate,
              nearbySheetChipsOnlyTranslate,
            ]
          : [nearbySheetExpandedTranslate, nearbySheetCollapsedTranslate];
        const nearest = snapPoints.reduce(
          (best, p) =>
            Math.abs(p - current) < Math.abs(best - current) ? p : best,
          snapPoints[0],
        );
        animateNearbySheetTo(nearest);
      },
    });
  }, [
    animateNearbySheetTo,
    nearbySheetExpandedTranslate,
    nearbySheetCollapsedTranslate,
    nearbySheetChipsOnlyTranslate,
    nearbySheetHasChipsOnlySnap,
    nearbySheetTranslateY,
    updateNearbySheetModeFromTranslate,
  ]);

  // If the expanded snap point changes (e.g., after measuring the search bar),
  // keep the sheet from overlapping the top overlay.
  useEffect(() => {
    const visible = !selectedPlace && nearbyPlaces.length > 0;
    if (!visible) return;
    if (nearbySheetDraggingRef.current) return;

    const current = nearbySheetTranslateYRef.current;
    const isAtExpanded = current <= nearbySheetExpandedTranslate + 0.5;
    const delta = Math.abs(current - nearbySheetExpandedTranslate);
    if (isAtExpanded && delta > 2) {
      animateNearbySheetTo(nearbySheetExpandedTranslate);
    }
  }, [
    animateNearbySheetTo,
    nearbyPlaces.length,
    nearbySheetExpandedTranslate,
    selectedPlace,
  ]);

  // Reset to expanded when the sheet becomes visible.
  useEffect(() => {
    const visible = !selectedPlace && nearbyPlaces.length > 0;
    if (visible && !wasNearbySheetVisibleRef.current) {
      // Default to collapsed (same feel as before); user can drag up to expand.
      nearbySheetTranslateY.setValue(nearbySheetCollapsedTranslate);
      nearbySheetTranslateYRef.current = nearbySheetCollapsedTranslate;
      setNearbySheetExpanded(false);
      setNearbySheetChipsOnly(false);
      nearbySheetExpandedRef.current = false;
      nearbySheetChipsOnlyRef.current = false;
    }
    wasNearbySheetVisibleRef.current = visible;
  }, [
    selectedPlace,
    nearbyPlaces.length,
    nearbySheetTranslateY,
    nearbySheetCollapsedTranslate,
  ]);

  // Keep the selected-place sheet from overlapping the top overlay.
  useEffect(() => {
    const visible = !!selectedPlace;
    if (!visible) return;
    if (selectedSheetDraggingRef.current) return;

    const current = selectedSheetTranslateYRef.current;
    const isAtExpanded = current <= selectedSheetExpandedTranslate + 0.5;
    const delta = Math.abs(current - selectedSheetExpandedTranslate);
    if (isAtExpanded && delta > 2) {
      animateSelectedSheetTo(selectedSheetExpandedTranslate);
    }
  }, [animateSelectedSheetTo, selectedPlace, selectedSheetExpandedTranslate]);

  // Reset to collapsed when a place sheet becomes visible.
  useEffect(() => {
    const visible = !!selectedPlace;
    if (visible && !wasSelectedSheetVisibleRef.current) {
      selectedSheetTranslateY.setValue(selectedSheetCollapsedTranslate);
      selectedSheetTranslateYRef.current = selectedSheetCollapsedTranslate;
      setSelectedSheetExpanded(false);
      selectedSheetExpandedRef.current = false;
      setSelectedSheetMinimized(false);
    }
    wasSelectedSheetVisibleRef.current = visible;
  }, [selectedPlace, selectedSheetTranslateY, selectedSheetCollapsedTranslate]);

  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [followUser, setFollowUser] = useState(false);
  const followUserRef = useRef(followUser);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const [route, setRoute] = useState<{
    polyline: LatLng[];
    distanceText: string;
    durationText: string;
    destination: Coords;
  } | null>(null);

  const lastOpenedPlaceIdRef = useRef<string | null>(null);
  const lastOpenedPoiKeyRef = useRef<string | null>(null);

  // Search History State
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<
    Array<{
      query: string;
      timestamp: number;
      placeId?: string;
      address?: string;
      isOpen?: boolean;
    }>
  >([]);

  // Voice Search State
  const [isListening, setIsListening] = useState(false);

  const getPoiKeyForPlace = (p: NearbyPlace): string | null => {
    const types = Array.isArray(p.types) ? p.types : [];
    if (types.includes("police")) return "police";
    if (types.includes("hospital")) return "hospital";
    if (types.includes("pharmacy")) return "pharmacy";
    if (activePoiKey) return activePoiKey;
    return null;
  };

  const getPoiMarkerIcon = (p: NearbyPlace) => {
    const key = getPoiKeyForPlace(p);
    if (!key) return null;
    const cat = POI_CATEGORIES.find((c) => c.key === key);
    return cat?.icon ?? null;
  };

  const makePhoneCall = async (phoneNumber: string) => {
    const cleaned = String(phoneNumber).replace(/[^\d+]/g, "");
    if (!cleaned) {
      Alert.alert("Invalid number", "This place has an invalid phone number.");
      return;
    }

    const url =
      Platform.OS === "ios" ? `telprompt:${cleaned}` : `tel:${cleaned}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Call not supported", "This device cannot place calls.");
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      console.error("[Call] openURL error:", e);
      Alert.alert("Call failed", "Could not open the phone dialer.");
    }
  };

  const openGoogleMapsDirections = async (destination: Coords) => {
    const dest = `${destination.latitude},${destination.longitude}`;

    // Prefer opening the Google Maps app when possible.
    const androidAppUrl = `google.navigation:q=${encodeURIComponent(dest)}&mode=d`;
    const iosAppUrl = `comgooglemaps://?daddr=${encodeURIComponent(dest)}&directionsmode=driving`;

    const originQuery = hasLocation
      ? `&origin=${encodeURIComponent(`${coords.latitude},${coords.longitude}`)}`
      : "";
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}${originQuery}&travelmode=driving`;

    try {
      if (Platform.OS === "android") {
        const can = await Linking.canOpenURL(androidAppUrl);
        if (can) {
          await Linking.openURL(androidAppUrl);
          return;
        }
      }

      if (Platform.OS === "ios") {
        const can = await Linking.canOpenURL(iosAppUrl);
        if (can) {
          await Linking.openURL(iosAppUrl);
          return;
        }
      }

      await Linking.openURL(webUrl);
    } catch (e) {
      console.error("[Route] openGoogleMapsDirections error:", e);
      Alert.alert("Could not open Google Maps", "Please try again.");
    }
  };

  // Search History Functions
  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem("mapSearchHistory");
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error("Error loading search history:", error);
    }
  };

  const saveSearchToHistory = async (
    searchQuery: string,
    place?: PlaceDetails,
  ) => {
    try {
      const newEntry = {
        query: searchQuery,
        timestamp: Date.now(),
        placeId: place?.placeId,
        address: place?.address,
        isOpen: place?.isOpenNow,
      };

      const updatedHistory = [
        newEntry,
        ...searchHistory.filter(
          (item) => item.query.toLowerCase() !== searchQuery.toLowerCase(),
        ),
      ].slice(0, 50); // Keep last 50 searches

      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem(
        "mapSearchHistory",
        JSON.stringify(updatedHistory),
      );
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem("mapSearchHistory");
    } catch (error) {
      console.error("Error clearing search history:", error);
    }
  };

  const categorizeSearchHistory = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    const today: typeof searchHistory = [];
    const yesterday: typeof searchHistory = [];
    const thisWeek: typeof searchHistory = [];
    const lastWeek: typeof searchHistory = [];
    const older: typeof searchHistory = [];

    searchHistory.forEach((item) => {
      const diff = now - item.timestamp;

      if (diff < oneDay) {
        today.push(item);
      } else if (diff < 2 * oneDay) {
        yesterday.push(item);
      } else if (diff < oneWeek) {
        thisWeek.push(item);
      } else if (diff < 2 * oneWeek) {
        lastWeek.push(item);
      } else {
        older.push(item);
      }
    });

    return { today, yesterday, thisWeek, lastWeek, older };
  };

  // Voice Search Handler
  const handleVoiceSearch = async () => {
    if (Platform.OS === "web") {
      // Web Speech API implementation
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        Alert.alert(
          "Not Supported",
          "Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.",
        );
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.start();
      } catch (error) {
        console.error("Error starting voice recognition:", error);
        setIsListening(false);
      }
    } else {
      // Mobile voice search - requires native rebuild
      Alert.alert(
        "Voice Search",
        "Voice search is currently available on web only. Mobile voice search requires the app to be rebuilt with native modules.",
        [{ text: "OK" }],
      );
    }
  };

  useEffect(() => {
    void loadSearchHistory();
  }, []);

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (showSearchHistory) {
          setShowSearchHistory(false);
          return true; // Prevent default behavior
        }
        return false; // Let default behavior happen
      },
    );

    return () => backHandler.remove();
  }, [showSearchHistory]);
  //get the current location through the expo location(this location then we use to show the user's poistion on the map and to search for nearby places)
  useEffect(() => {
    (async () => {
      try {
        // Request permissions
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Location is required for safety features.",
          );
          setLocationDenied(true);
          setLoading(false);
          return;
        }

        // Fast path: last known fix (instant) so the map can center quickly.
        // NOTE: last-known can be stale/coarse; we refine below.
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          const nextCoords = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
          setCoords(nextCoords);
          setCoordsAccuracyM(
            typeof lastKnown.coords.accuracy === "number"
              ? lastKnown.coords.accuracy
              : null,
          );
          setHasLocation(true);

          const nextRegion: Region = {
            latitude: nextCoords.latitude,
            longitude: nextCoords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setMapRegion(nextRegion);
          mapRef.current?.animateToRegion(nextRegion, 450);
        }

        // Refine path: request a fresh GPS fix for more stable/accurate distances.
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          // Android-only; harmless elsewhere.
          mayShowUserSettingsDialog: true,
        });

        const nextCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setCoords(nextCoords);
        setCoordsAccuracyM(
          typeof location.coords.accuracy === "number"
            ? location.coords.accuracy
            : null,
        );
        setHasLocation(true);

        const nextRegion: Region = {
          latitude: nextCoords.latitude,
          longitude: nextCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(nextRegion);
        mapRef.current?.animateToRegion(nextRegion, 450);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Handle dimension changes (device rotation, split screen, etc.)
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    followUserRef.current = followUser;
  }, [followUser]);

  useEffect(() => {
    // Follow mode uses live location updates.
    // IMPORTANT: we keep the location watch running even when follow mode is off.
    // Otherwise, `coords` becomes stale while the user is moving, and distances like
    // "123m away" in bottom sheets can be wrong.
    if (locationDenied) {
      watchRef.current?.remove();
      watchRef.current = null;
      return;
    }

    if (watchRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        watchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            // Keep it responsive enough for distance labels, but not ultra-chatty.
            distanceInterval: 10,
            // Android-only; allows updates even if user is stationary.
            timeInterval: 5_000,
          },
          (loc) => {
            if (cancelled) return;

            const next = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setCoords(next);
            setCoordsAccuracyM(
              typeof loc.coords.accuracy === "number" ? loc.coords.accuracy : null,
            );
            setHasLocation(true);

            // Only move the camera when follow mode is enabled.
            if (followUserRef.current) {
              const nextRegion: Region = {
                latitude: next.latitude,
                longitude: next.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              setMapRegion(nextRegion);
              mapRef.current?.animateToRegion(nextRegion, 350);
            }
          },
        );
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [locationDenied]);

  const hasAccurateLocationForDistance =
    hasLocation &&
    typeof coordsAccuracyM === "number" &&
    Number.isFinite(coordsAccuracyM) &&
    coordsAccuracyM <= 80;

  useEffect(() => {
    // Android (and sometimes iOS) can cache custom Marker views as bitmaps.
    // Briefly enabling tracksViewChanges forces a refresh when theme changes.
    setMeMarkerTracksViewChanges(true);
    const t = setTimeout(() => setMeMarkerTracksViewChanges(false), 600);
    return () => clearTimeout(t);
  }, [isDark]);

  useEffect(() => {
    // Same caching issue applies to POI markers.
    setPoiMarkerTracksViewChanges(true);
    const t = setTimeout(() => setPoiMarkerTracksViewChanges(false), 600);
    return () => clearTimeout(t);
  }, [isDark]);

  // Rough bounding box for Sri Lanka (keeps map from defaulting to a world view).
  const SRI_LANKA_BOUNDS = {
    minLat: 5.85,
    maxLat: 9.85,
    minLng: 79.4,
    maxLng: 82.1,
  };

  const isWithinSriLanka =
    coords.latitude >= SRI_LANKA_BOUNDS.minLat &&
    coords.latitude <= SRI_LANKA_BOUNDS.maxLat &&
    coords.longitude >= SRI_LANKA_BOUNDS.minLng &&
    coords.longitude <= SRI_LANKA_BOUNDS.maxLng;

  const displayCenter =
    hasLocation && isWithinSriLanka ? coords : SRI_LANKA_CENTER;

  const initialRegion = useMemo<Region>(
    () => ({
      latitude: displayCenter.latitude,
      longitude: displayCenter.longitude,
      latitudeDelta: hasLocation ? 0.01 : 2.5,
      longitudeDelta: hasLocation ? 0.01 : 2.5,
    }),
    [displayCenter.latitude, displayCenter.longitude, hasLocation],
  );

  useEffect(() => {
    const handle = setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSuggestions([]);
        return;
      }

      if (!inputFocused) {
        setSuggestions([]);
        return;
      }

      const apiKey = ensureGoogleApiKey();
      if (!apiKey) {
        setSuggestions([]);
        return;
      }

      setAutoLoading(true);
      const list = await autocompletePlaces(
        trimmed,
        mapRegion.latitude,
        mapRegion.longitude,
      );
      setSuggestions(list);
      setAutoLoading(false);
    }, 250);

    return () => clearTimeout(handle);
  }, [query, mapRegion.latitude, mapRegion.longitude]);

  const recenter = async () => {
    // Recenter should not leave the search UI focused (which can feel like the
    // map can't be panned/zoomed because overlays/keyboard steal gestures).
    setInputFocused(false);
    setSuggestions([]);
    Keyboard.dismiss();

    // Common UX: tapping the locate button recenters AND resumes follow mode.
    setFollowUser(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        Alert.alert(
          "Permission Denied",
          "Location is required to recenter the map.",
        );
        return;
      }

      setLocationDenied(false);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });

      const nextCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCoords(nextCoords);
      setCoordsAccuracyM(
        typeof location.coords.accuracy === "number" ? location.coords.accuracy : null,
      );
      setHasLocation(true);

      const nextRegion: Region = {
        latitude: nextCoords.latitude,
        longitude: nextCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 450);
    } catch (e) {
      console.error("[recenter] failed", e);

      // Fallback: at least animate to our best-known center.
      const nextRegion: Region = {
        latitude: displayCenter.latitude,
        longitude: displayCenter.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 450);
    }
  };

  const openAddReview = async (placeId: string) => {
    const url = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(
      placeId,
    )}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error("[Add review] openURL failed", url, e);
    }
  };

  const selectPlaceById = async (
    placeId: string,
    fallback?: PlaceDetails,
  ): Promise<PlaceDetails | null> => {
    console.log("[selectPlaceById] Starting with placeId:", placeId);
    const apiKey = ensureGoogleApiKey();
    if (!apiKey) {
      console.error("[selectPlaceById] No API key available");
      if (fallback) setSelectedPlace(fallback);
      return fallback || null;
    }
    if (fallback) {
      setSelectedPlace(fallback);
    }
    setPlaceError(null);
    setPlaceLoading(true);
    try {
      console.log("[selectPlaceById] Fetching place details...");
      const details = await getPlaceDetails(placeId);
      console.log(
        "[selectPlaceById] Details received:",
        details ? details.name : "null",
      );
      if (!details) {
        const errorMsg =
          "Could not load photos/details for this place. Check Places API + billing + API key restrictions.";
        console.error("[selectPlaceById]", errorMsg);
        setPlaceError(errorMsg);
      } else {
        setSelectedPlace(details);
      }
      setRoute(null);
      return details || fallback || null;
    } catch (e) {
      console.error("[selectPlaceById] error:", e);
      setPlaceError("Unexpected error while loading place details.");
      return fallback || null;
    } finally {
      setPlaceLoading(false);
    }
  };

  const moveToPlace = (p: { latitude: number; longitude: number }) => {
    console.log("[moveToPlace] Moving map to:", p.latitude, p.longitude);
    const nextRegion: Region = {
      latitude: p.latitude,
      longitude: p.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setMapRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 450);
  };

  const distanceMeters = (a: Coords, b: Coords) => {
    const R = 6371000;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  };

  const formatDistance = (meters: number): string => {
    if (!Number.isFinite(meters) || meters <= 0) return "";
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getCategoryLabel = (types?: string[]): string => {
    const list = Array.isArray(types) ? types : [];
    if (list.includes("hospital")) return "Hospital";
    if (list.includes("police")) return "Police";
    if (list.includes("gas_station")) return "Fuel";
    if (list.includes("pharmacy")) return "Pharmacy";
    if (list.includes("restaurant")) return "Food";
    return "Place";
  };

  const getSafetyNote = (types?: string[]): string | null => {
    const list = Array.isArray(types) ? types : [];
    if (list.includes("hospital")) {
      return "Safe zone nearby. This hospital can help in emergencies.";
    }
    if (list.includes("police")) {
      return "Safe zone nearby. This police station can assist you.";
    }
    return null;
  };

  const sharePlace = async (place: PlaceDetails) => {
    const url =
      place.googleMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.latitude},${place.longitude}`,
      )}`;

    const lines = [place.name];
    if (place.address) lines.push(place.address);
    lines.push(url);

    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      // ignore
    }
  };

  const ensureGoogleApiKey = (): string | null => {
    const key = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    if (!key) {
      Alert.alert(
        "Missing API key",
        "Set EXPO_PUBLIC_GOOGLE_API_KEY in your .env to enable Places/Directions.",
      );
      return null;
    }
    return key;
  };

  useEffect(() => {
    // Hydrate "open now" status so cards can show Open/Closed.
    // We do this when the Open-now filter is enabled OR when a POI category list
    // is visible (activePoiKey), so every card can be labeled.
    if (!filterOpenNow && !activePoiKey) return;
    if (!nearbyPlaces.length) return;

    const pending = nearbyPlaces.filter((p) => {
      if (attemptedOpenNowRef.current.has(p.placeId)) return false;
      const needsOpenNow = typeof p.isOpenNow !== "boolean";
      const needsNextOpen =
        p.isOpenNow === false && typeof p.nextOpenTimeText !== "string";
      return needsOpenNow || needsNextOpen;
    });

    if (!pending.length) return;

    // Mark as attempted immediately to avoid duplicate requests if state changes mid-flight.
    for (const p of pending) attemptedOpenNowRef.current.add(p.placeId);

    let cancelled = false;
    setOpenNowHydrating(true);

    void (async () => {
      const results = new Map<
        string,
        {
          isOpenNow?: boolean;
          nextOpenTimeText?: string;
        }
      >();
      const batchSize = 6;

      for (let i = 0; i < pending.length; i += batchSize) {
        if (cancelled) return;
        const batch = pending.slice(i, i + batchSize);

        const settled = await Promise.all(
          batch.map(async (p) => {
            try {
              const details = await getPlaceDetails(p.placeId);
              if (!details) return null;

              const patch: {
                placeId: string;
                isOpenNow?: boolean;
                nextOpenTimeText?: string;
              } = { placeId: p.placeId };

              if (typeof details.isOpenNow === "boolean") {
                patch.isOpenNow = details.isOpenNow;
              }
              if (typeof details.nextOpenTimeText === "string") {
                patch.nextOpenTimeText = details.nextOpenTimeText;
              }

              return patch.isOpenNow !== undefined ||
                patch.nextOpenTimeText !== undefined
                ? patch
                : null;
            } catch {
              return null;
            }
          }),
        );

        for (const item of settled) {
          if (item)
            results.set(item.placeId, {
              isOpenNow: item.isOpenNow,
              nextOpenTimeText: item.nextOpenTimeText,
            });
        }
      }

      if (cancelled) return;

      if (results.size) {
        setNearbyPlaces((prev) =>
          prev.map((p) => {
            const v = results.get(p.placeId);
            if (!v) return p;
            return {
              ...p,
              ...(typeof v.isOpenNow === "boolean"
                ? { isOpenNow: v.isOpenNow }
                : {}),
              ...(typeof v.nextOpenTimeText === "string"
                ? { nextOpenTimeText: v.nextOpenTimeText }
                : {}),
            };
          }),
        );
      }
    })().finally(() => {
      if (!cancelled) setOpenNowHydrating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filterOpenNow, activePoiKey, nearbyPlaces]);

  useEffect(() => {
    if (!filterWheelchair) return;
    if (!nearbyPlaces.length) return;

    const pending = nearbyPlaces.filter(
      (p) =>
        typeof p.wheelchairAccessibleEntrance !== "boolean" &&
        !attemptedWheelchairRef.current.has(p.placeId),
    );

    if (!pending.length) return;

    // Mark as attempted immediately to avoid duplicate requests if state changes mid-flight.
    for (const p of pending) attemptedWheelchairRef.current.add(p.placeId);

    let cancelled = false;
    setWheelchairHydrating(true);

    void (async () => {
      const results = new Map<string, boolean>();
      const batchSize = 6;

      for (let i = 0; i < pending.length; i += batchSize) {
        if (cancelled) return;
        const batch = pending.slice(i, i + batchSize);

        const settled = await Promise.all(
          batch.map(async (p) => {
            try {
              const details = await getPlaceDetails(p.placeId);
              return typeof details?.wheelchairAccessibleEntrance === "boolean"
                ? {
                    placeId: p.placeId,
                    wheelchairAccessibleEntrance:
                      details.wheelchairAccessibleEntrance,
                  }
                : null;
            } catch {
              return null;
            }
          }),
        );

        for (const item of settled) {
          if (item)
            results.set(item.placeId, item.wheelchairAccessibleEntrance);
        }
      }

      if (cancelled) return;

      if (results.size) {
        setNearbyPlaces((prev) =>
          prev.map((p) => {
            const v = results.get(p.placeId);
            return typeof v === "boolean"
              ? { ...p, wheelchairAccessibleEntrance: v }
              : p;
          }),
        );
      }
    })().finally(() => {
      if (!cancelled) setWheelchairHydrating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filterWheelchair, nearbyPlaces]);

  const filteredNearbyPlaces = useMemo(() => {
    let list = [...nearbyPlaces];

    if (filterOpenNow && !openNowHydrating) {
      // Keep only places we know are open right now.
      list = list.filter((p) => p.isOpenNow === true);
    }

    if (filterWheelchair && !wheelchairHydrating) {
      // Keep only places we know have a wheelchair-accessible entrance.
      list = list.filter((p) => p.wheelchairAccessibleEntrance === true);
    }

    if (sortMode === "distance") {
      const base = hasAccurateLocationForDistance
        ? coords
        : { latitude: mapRegion.latitude, longitude: mapRegion.longitude };

      list.sort((a, b) => {
        const da = distanceMeters(base, {
          latitude: a.latitude,
          longitude: a.longitude,
        });
        const db = distanceMeters(base, {
          latitude: b.latitude,
          longitude: b.longitude,
        });

        const aVal = Number.isFinite(da) ? da : Number.POSITIVE_INFINITY;
        const bVal = Number.isFinite(db) ? db : Number.POSITIVE_INFINITY;
        if (aVal !== bVal) return aVal - bVal;
        return a.name.localeCompare(b.name);
      });
    }

    return list;
  }, [
    nearbyPlaces,
    filterOpenNow,
    openNowHydrating,
    filterWheelchair,
    wheelchairHydrating,
    sortMode,
    hasAccurateLocationForDistance,
    coords,
    mapRegion,
  ]);

  const decodePolyline = (encoded: string): LatLng[] => {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates: LatLng[] = [];

    while (index < encoded.length) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return coordinates;
  };

  const fetchDirections = async (destination: Coords) => {
    const apiKey = ensureGoogleApiKey();
    if (!apiKey) return;

    if (!hasLocation) {
      Alert.alert("Location required", "Enable location to get directions.");
      return;
    }

    setDirectionsLoading(true);
    try {
      const origin = `${coords.latitude},${coords.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin,
      )}&destination=${encodeURIComponent(dest)}&mode=driving&key=${encodeURIComponent(
        apiKey,
      )}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data || data.status !== "OK" || !Array.isArray(data.routes)) {
        console.error("[Directions]", data?.status, data?.error_message);
        Alert.alert("Directions unavailable", "Could not fetch a route.");
        return;
      }

      const firstRoute = data.routes[0];
      const encoded: string | undefined = firstRoute?.overview_polyline?.points;
      const leg = Array.isArray(firstRoute?.legs) ? firstRoute.legs[0] : null;

      const polyline = encoded ? decodePolyline(encoded) : [];

      setRoute({
        polyline,
        distanceText: leg?.distance?.text || "",
        durationText: leg?.duration?.text || "",
        destination,
      });

      if (polyline.length) {
        mapRef.current?.fitToCoordinates(polyline, {
          edgePadding: { top: 160, right: 40, bottom: 240, left: 40 },
          animated: true,
        });
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not fetch directions.");
    } finally {
      setDirectionsLoading(false);
    }
  };

  const POI_CATEGORIES = [
    {
      key: "police",
      label: "Police Stations",
      keyword: "police",
      icon: icons.police,
    },
    {
      key: "hospital",
      label: "Hospitals",
      keyword: "hospital",
      icon: icons.hospital,
    },
    {
      key: "pharmacy",
      label: "Pharmacies",
      keyword: "pharmacy",
      icon: icons.pharmacy,
    },
  ] as const;

  const loadPoiCategory = async (key: string, keyword: string) => {
    const apiKey = ensureGoogleApiKey();
    if (!apiKey) return;

    const selected = POI_CATEGORIES.find((c) => c.key === key);
    setQuery(selected?.label ?? keyword);
    setInputFocused(false);
    setSuggestions([]);
    Keyboard.dismiss();

    const base = hasLocation
      ? coords
      : { latitude: mapRegion.latitude, longitude: mapRegion.longitude };

    // Reset filters whenever a new tab/category is chosen
    setFilterOpenNow(false);
    setFilterWheelchair(false);
    setSortMode("default");

    attemptedOpenNowRef.current.clear();
    attemptedWheelchairRef.current.clear();

    setActivePoiKey(key);
    setPoiLoading(true);
    try {
      const list = await searchNearbyPlaces(
        base.latitude,
        base.longitude,
        keyword,
        20,
      );

      setNearbyPlaces(shuffleArray(list));
      // Reset any previously selected place/route so we can show the nearby list
      setSelectedPlace(null);
      setRoute(null);

      if (list.length) {
        mapRef.current?.fitToCoordinates(
          list.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
          {
            edgePadding: { top: 180, right: 40, bottom: 220, left: 40 },
            animated: true,
          },
        );
      } else {
        Alert.alert("No results", `No nearby ${keyword} found.`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not load nearby places.");
    } finally {
      setPoiLoading(false);
    }
  };

  const toggleOpenNow = () => {
    const apiKey = ensureGoogleApiKey();
    if (!apiKey) return;

    const base = hasLocation
      ? coords
      : { latitude: mapRegion.latitude, longitude: mapRegion.longitude };

    const next = !filterOpenNow;
    setFilterOpenNow(next);

    // Only the bottom-sheet POI list needs this behavior.
    if (!activePoiKey) return;
    const cat = POI_CATEGORIES.find((c) => c.key === activePoiKey);
    if (!cat) return;

    // Re-query using Places' built-in open-now filter for reliability.
    attemptedOpenNowRef.current.clear();

    setOpenNowHydrating(true);
    setPoiLoading(true);
    void (async () => {
      try {
        const list = await searchNearbyPlaces(
          base.latitude,
          base.longitude,
          cat.keyword,
          20,
          { openNow: next },
        );
        setNearbyPlaces(shuffleArray(list));
        setSelectedPlace(null);
        setRoute(null);
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Could not apply Open now filter.");
      } finally {
        setPoiLoading(false);
        setOpenNowHydrating(false);
      }
    })();
  };

  const toggleWheelchair = () => {
    const next = !filterWheelchair;
    setFilterWheelchair(next);

    if (!next) {
      setWheelchairHydrating(false);
      return;
    }

    // Allow re-trying details hydration when the user toggles the filter on.
    attemptedWheelchairRef.current.clear();

    // Prevent the list from instantly going empty while we fetch details.
    setWheelchairHydrating(true);
  };

  const onPickSuggestion = async (s: PlaceSuggestion) => {
    setQuery(s.description);
    setSuggestions([]);
    setInputFocused(false);
    Keyboard.dismiss();

    // Show the sheet immediately (Google Maps style), then hydrate with real details.
    const fallback: PlaceDetails = {
      placeId: s.placeId,
      name: s.description,
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
    };

    const details = await selectPlaceById(s.placeId, fallback);
    if (!details) {
      Alert.alert("Not Found", "Could not load that place.");
      return;
    }

    // Save to search history
    await saveSearchToHistory(s.description, details);

    setNearbyPlaces([]);
    setActivePoiKey(null);
    moveToPlace(details);
  };

  useEffect(() => {
    const raw = params?.placeId;
    const placeId = Array.isArray(raw) ? raw[0] : raw;
    if (!placeId) return;

    console.log("[Map useEffect] Received placeId:", placeId);

    // Allow re-opening if timestamp parameter is present
    const hasTimestamp = params?.t;
    if (!hasTimestamp && lastOpenedPlaceIdRef.current === placeId) {
      console.log("[Map useEffect] Skipping - same placeId without timestamp");
      return;
    }

    lastOpenedPlaceIdRef.current = placeId;

    // Reset state to ensure fresh load
    console.log("[Map useEffect] Resetting state and loading place details");
    setSelectedPlace(null);
    setRoute(null);
    setInputFocused(false);
    Keyboard.dismiss();
    setSuggestions([]);
    setNearbyPlaces([]);
    setActivePoiKey(null);

    void (async () => {
      try {
        console.log("[Map useEffect] Calling selectPlaceById...");
        const details = await selectPlaceById(placeId);
        if (details) {
          console.log(
            "[Map useEffect] Place details loaded successfully:",
            details.name,
          );
          moveToPlace(details);
        } else {
          console.error("[Map useEffect] No place details returned");
          Alert.alert(
            "Place Not Found",
            "Could not load details for this location. Please try again.",
          );
        }
      } catch (error) {
        console.error("[Map useEffect] Error loading place:", error);
        Alert.alert(
          "Error",
          "Failed to load place details. Please check your internet connection.",
        );
      }
    })();
  }, [params?.placeId, params?.t]);

  useEffect(() => {
    const rawPoi = params?.poi;
    const poi = Array.isArray(rawPoi) ? rawPoi[0] : rawPoi;
    if (!poi) return;

    // If a specific placeId is present, that takes precedence.
    const rawPlace = params?.placeId;
    const placeId = Array.isArray(rawPlace) ? rawPlace[0] : rawPlace;
    if (placeId) return;

    const normalized = String(poi).trim().toLowerCase();
    const key = normalized.includes("police")
      ? "police"
      : normalized.includes("hospital")
        ? "hospital"
        : normalized.includes("pharmacy")
          ? "pharmacy"
          : null;
    if (!key) return;

    const hasTimestamp = params?.t;
    if (!hasTimestamp && lastOpenedPoiKeyRef.current === key) return;
    lastOpenedPoiKeyRef.current = key;

    const cat = POI_CATEGORIES.find((c) => c.key === key);
    if (!cat) return;

    // Clear any selected place to show the nearby list.
    setSelectedPlace(null);
    setRoute(null);
    setInputFocused(false);
    Keyboard.dismiss();
    setSuggestions([]);
    setNearbyPlaces([]);

    void loadPoiCategory(cat.key, cat.keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.poi, params?.placeId, params?.t]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.mapWrap}>
        <MapView
          ref={(ref) => {
            mapRef.current = ref;
          }}
          style={[
            styles.map,
            { width: dimensions.width, height: dimensions.height },
          ]}
          userInterfaceStyle={isDark ? "dark" : "light"}
          {...(Platform.OS === "android" ? { provider: PROVIDER_GOOGLE } : {})}
          initialRegion={initialRegion}
          onRegionChangeComplete={(
            r,
            details?: { isGesture?: boolean } | undefined,
          ) => {
            setMapRegion(r);

            // If the user manually pans/zooms, stop following/recentering.
            if (details?.isGesture) {
              setFollowUser(false);
            }
          }}
          onPanDrag={() => {
            // Some platforms don't populate `details.isGesture`.
            setFollowUser(false);
          }}
          // We render our own current-location marker (pin). Disable the
          // platform blue-dot layer so we don't show both.
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass
          toolbarEnabled={Platform.OS === "android"}
          showsTraffic={trafficEnabled}
          rotateEnabled
          pitchEnabled
          zoomEnabled
          scrollEnabled
          minZoomLevel={3}
          maxZoomLevel={20}
          zoomControlEnabled={true}
          zoomTapEnabled={true}
          onPress={(e) => {
            // Make single-tap feel like Google Maps: try to open nearest place.
            // (Especially useful on iOS where POI taps don't provide a placeId.)
            const apiKey = ensureGoogleApiKey();
            if (!apiKey) return;
            const c = e?.nativeEvent?.coordinate;
            if (!c) return;
            if (placeLoading || directionsLoading) return;

            void (async () => {
              const nearest = await findNearestPlaceAt(
                c.latitude,
                c.longitude,
                45,
              );
              if (!nearest) return;

              const tap = { latitude: c.latitude, longitude: c.longitude };
              const found = {
                latitude: nearest.latitude,
                longitude: nearest.longitude,
              };
              // Only accept if truly near the tap to avoid random matches.
              if (distanceMeters(tap, found) > 70) return;

              const fallback: PlaceDetails = {
                placeId: nearest.placeId,
                name: nearest.name,
                latitude: nearest.latitude,
                longitude: nearest.longitude,
                address: nearest.vicinity,
                rating: nearest.rating,
                userRatingsTotal: nearest.userRatingsTotal,
                types: nearest.types,
              };
              const details = await selectPlaceById(nearest.placeId, fallback);
              if (details) moveToPlace(details);
            })();
          }}
          onLongPress={(e) => {
            const apiKey = ensureGoogleApiKey();
            if (!apiKey) return;
            const c = e?.nativeEvent?.coordinate;
            if (!c) return;
            void (async () => {
              const nearest = await findNearestPlaceAt(c.latitude, c.longitude);
              if (!nearest) {
                Alert.alert(
                  "No place found",
                  "Try long-pressing closer to a place icon/name.",
                );
                return;
              }
              const fallback: PlaceDetails = {
                placeId: nearest.placeId,
                name: nearest.name,
                latitude: nearest.latitude,
                longitude: nearest.longitude,
                address: nearest.vicinity,
                rating: nearest.rating,
                userRatingsTotal: nearest.userRatingsTotal,
                types: nearest.types,
              };
              const details = await selectPlaceById(nearest.placeId, fallback);
              if (details) moveToPlace(details);
            })();
          }}
          {...(Platform.OS === "android"
            ? {
                // Google POI taps (Android + Google provider) can provide a placeId.
                onPoiClick: (e: any) => {
                  const placeId = e?.nativeEvent?.placeId;
                  const name = e?.nativeEvent?.name;
                  if (!placeId) return;
                  void (async () => {
                    const details = await selectPlaceById(placeId, {
                      placeId,
                      name: name || "Selected place",
                      latitude: e?.nativeEvent?.coordinate?.latitude,
                      longitude: e?.nativeEvent?.coordinate?.longitude,
                    });
                    if (details) moveToPlace(details);
                  })();
                },
              }
            : {})}
        >
          {hasLocation && (
            <Marker
              key={isDark ? "me-dark" : "me-light"}
              coordinate={coords}
              title="You"
              description="Current location"
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={meMarkerTracksViewChanges}
              onPress={() => {
                setSelectedPlace(null);
                setRoute(null);
              }}
            >
              {isDark ? (
                <View style={styles.liveLocationNeonWrapDark}>
                  <View style={styles.liveLocationNeonGlow3Dark} />
                  <View style={styles.liveLocationNeonGlow2Dark} />
                  <View style={styles.liveLocationNeonGlow1Dark} />

                  <View style={styles.liveLocationNeonPinWrapDark}>
                    <Ionicons
                      name="location-sharp"
                      size={52}
                      color="#FFFFFF"
                      style={styles.liveLocationNeonPinBackDark}
                    />
                    <Ionicons
                      name="location-sharp"
                      size={48}
                      color="#FFF44F"
                      style={styles.liveLocationNeonPinFrontDark}
                    />
                  </View>
                </View>
              ) : (
                <View
                  style={[styles.liveLocationPinWrap, styles.poiMarkerLight]}
                >
                  <Ionicons
                    name="location-sharp"
                    size={40}
                    color="#FFFFFF"
                    style={styles.liveLocationPinBack}
                  />
                  <Ionicons
                    name="location-sharp"
                    size={36}
                    color="#1E90FF"
                    style={styles.liveLocationPinFront}
                  />
                </View>
              )}
            </Marker>
          )}

          {selectedPlace && (
            <Marker
              coordinate={{
                latitude: selectedPlace.latitude,
                longitude: selectedPlace.longitude,
              }}
              title={selectedPlace.name}
              description={selectedPlace.address || selectedPlace.placeId}
              pinColor={isDark ? "#FF2D55" : "#E11D48"}
              onCalloutPress={() => {
                void selectPlaceById(selectedPlace.placeId, selectedPlace);
              }}
            />
          )}

          {nearbyPlaces.map((p) =>
            (() => {
              const IconComponent = getPoiMarkerIcon(p);
              return (
                <Marker
                  key={`${p.placeId}-${isDark ? "dark" : "light"}`}
                  coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                  title={p.name}
                  description={p.vicinity}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={poiMarkerTracksViewChanges}
                  onPress={() => {
                    const fallback: PlaceDetails = {
                      placeId: p.placeId,
                      name: p.name,
                      latitude: p.latitude,
                      longitude: p.longitude,
                      address: p.vicinity,
                      rating: p.rating,
                      userRatingsTotal: p.userRatingsTotal,
                      types: p.types,
                    };
                    void (async () => {
                      const details = await selectPlaceById(
                        p.placeId,
                        fallback,
                      );
                      if (details) moveToPlace(details);
                    })();
                  }}
                  onCalloutPress={() => {
                    const fallback: PlaceDetails = {
                      placeId: p.placeId,
                      name: p.name,
                      latitude: p.latitude,
                      longitude: p.longitude,
                      address: p.vicinity,
                      rating: p.rating,
                      userRatingsTotal: p.userRatingsTotal,
                      types: p.types,
                    };
                    void (async () => {
                      const details = await selectPlaceById(
                        p.placeId,
                        fallback,
                      );
                      if (details) moveToPlace(details);
                    })();
                  }}
                >
                  <View
                    style={[
                      styles.poiMarker,
                      isDark ? styles.poiMarkerDark : styles.poiMarkerLight,
                    ]}
                  >
                    {IconComponent ? (
                      <IconComponent
                        width={18}
                        height={18}
                        fill={isDark ? "#FF2D55" : "#FFFFFF"}
                      />
                    ) : null}
                  </View>
                </Marker>
              );
            })(),
          )}

          {route?.polyline?.length ? (
            <Polyline
              coordinates={route.polyline}
              strokeWidth={5}
              strokeColor="#0EA5E9"
            />
          ) : null}
        </MapView>

        <View
          key={isDark ? "dark" : "light"}
          style={styles.searchWrap}
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            setTopOverlayBottomY(y + height);
          }}
        >
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchInputContainer,
                !isDark && {
                  backgroundColor: theme.background,
                  borderColor: "transparent",
                },
                !isDark && styles.searchBarShadow,
                inputFocused && styles.searchInputFocused,
                inputFocused && !isDark && { borderColor: theme.icon },
              ]}
            >
              <TouchableOpacity
                onPress={() => setShowSearchHistory(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={isDark ? "#fff" : theme.icon}
                />
              </TouchableOpacity>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search places"
                placeholderTextColor={
                  isDark ? "rgba(255,255,255,0.5)" : "#5F6368"
                }
                style={[styles.searchInput, !isDark && { color: "#5F6368" }]}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />
              <TouchableOpacity
                onPress={recenter}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="locate-outline"
                  size={20}
                  color={isDark ? "#fff" : theme.icon}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.poiRow}
          >
            {POI_CATEGORIES.map((c) => {
              const active = activePoiKey === c.key;
              const IconComponent = c.icon;
              const pressedDark = isDark && poiPressedKey === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => void loadPoiCategory(c.key, c.keyword)}
                  onPressIn={() => setPoiPressedKey(c.key)}
                  onPressOut={() => setPoiPressedKey(null)}
                  style={[
                    styles.poiChip,
                    pressedDark && {
                      backgroundColor: "#8FD3FF",
                      borderColor: "#8FD3FF",
                      borderWidth: 2,
                    },
                    !isDark && {
                      backgroundColor: theme.background,
                      borderColor: "transparent",
                      borderWidth: 1.5,
                    },
                    poiPressedKey === c.key &&
                      !isDark && {
                        backgroundColor: theme.card,
                        borderColor: theme.icon,
                        borderWidth: 2,
                      },
                    active && styles.poiChipActive,
                    active &&
                      !isDark && {
                        backgroundColor: theme.card,
                        borderColor: theme.icon,
                        borderWidth: 2,
                      },
                  ]}
                  disabled={poiLoading}
                >
                  <IconComponent
                    width={18}
                    height={18}
                    fill={
                      pressedDark ? "#0B253A" : isDark ? "#5FC9F1" : theme.icon
                    }
                  />
                  <Text
                    style={[
                      styles.poiChipText,
                      active && styles.poiChipTextActive,
                      pressedDark && { color: "#0B253A" },
                      !isDark && { color: theme.text },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {inputFocused && (autoLoading || suggestions.length > 0) && (
            <View
              style={[
                styles.suggestions,
                isDark && { backgroundColor: "#031B2E" },
                !isDark && {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
                !isDark && styles.floatingShadowStrong,
              ]}
            >
              {autoLoading && (
                <Text
                  style={[
                    styles.suggestionLoading,
                    isDark && { color: "rgba(255,255,255,0.9)" },
                    !isDark && { color: theme.icon },
                  ]}
                >
                  Searching…
                </Text>
              )}
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={suggestions}
                keyExtractor={(item) => item.placeId}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.suggestionItem,
                      isDark && {
                        borderTopColor: "rgba(255,255,255,0.2)",
                      },
                    ]}
                    onPress={() => onPickSuggestion(item)}
                  >
                    <Text
                      style={[
                        styles.suggestionText,
                        isDark && { color: "#fff" },
                        !isDark && { color: "#5F6368" },
                      ]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {selectedPlace && (
          <AnimatedBlurView
            intensity={60}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.nearbySheet,
              isDark && { backgroundColor: "rgba(2,18,33,0.7)" },
              !isDark && { backgroundColor: "rgba(255,255,255,0.55)" },
              { height: selectedSheetHeightPx },
              { transform: [{ translateY: selectedSheetTranslateY }] },
            ]}
          >
            <View
              style={{ flex: 1 }}
              {...selectedSheetPanResponder.panHandlers}
            >
              <View
                style={styles.nearbyDragZone}
                onLayout={(e) => {
                  setSelectedSheetDragZoneHeight(e.nativeEvent.layout.height);
                }}
              >
                <View style={styles.nearbyHandle} />
              </View>

              <View
                style={styles.nearbyHeaderRow}
                onLayout={(e) => {
                  setSelectedSheetHeaderHeight(e.nativeEvent.layout.height);
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.nearbyTitle, isDark && { color: "#FFFFFF" }]}
                    numberOfLines={selectedSheetMinimized ? 1 : 2}
                  >
                    {selectedPlace.name}
                  </Text>

                  {!selectedSheetMinimized && (
                    <Text
                      style={[
                        styles.nearbySubtitle,
                        isDark && { color: "rgba(255,255,255,0.7)" },
                      ]}
                      numberOfLines={1}
                    >
                      {(() => {
                        const cat = getCategoryLabel(selectedPlace.types);
                        const distValue = hasAccurateLocationForDistance
                          ? formatDistance(
                              distanceMeters(coords, {
                                latitude: selectedPlace.latitude,
                                longitude: selectedPlace.longitude,
                              }),
                            )
                          : "";
                        const dist = distValue ? `${distValue} away` : "";

                        if (cat && dist) {
                          return (
                            <>
                              <Text style={styles.nearbySubtitleStrong}>
                                {cat}
                              </Text>
                              {` • ${dist}`}
                            </>
                          );
                        }
                        if (cat) {
                          return (
                            <Text style={styles.nearbySubtitleStrong}>
                              {cat}
                            </Text>
                          );
                        }
                        return dist;
                      })()}
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => void sharePlace(selectedPlace)}
                    style={styles.nearbyClose}
                  >
                    <Ionicons
                      name="share-outline"
                      size={18}
                      color={isDark ? "#8FD3FF" : "#0B253A"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPlace(null);
                      setRoute(null);
                    }}
                    style={styles.nearbyClose}
                  >
                    <Feather
                      name="x"
                      size={18}
                      color={isDark ? "#8FD3FF" : "#0B253A"}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {!selectedSheetMinimized && (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 10 }}
                  scrollEnabled={selectedSheetExpanded}
                  showsVerticalScrollIndicator={false}
                  onScroll={(e) => {
                    selectedSheetScrollYRef.current =
                      e.nativeEvent.contentOffset?.y ?? 0;
                  }}
                  scrollEventThrottle={16}
                >
                  <View
                    onLayout={(e) => {
                      const h = e.nativeEvent.layout.height;
                      if (typeof h === "number" && h > 0) {
                        setSelectedSheetBodyHeight(h);
                      }
                    }}
                  >
                    {(placeLoading || directionsLoading) && (
                      <View style={styles.sheetLoadingRow}>
                        <ActivityIndicator size="small" color="#2F6FED" />
                        <Text
                          style={[
                            styles.sheetLoadingText,
                            isDark && { color: "rgba(255,255,255,0.7)" },
                          ]}
                        >
                          {placeLoading ? "Loading details…" : "Loading route…"}
                        </Text>
                      </View>
                    )}

                    {placeError ? (
                      <Text style={styles.sheetErrorText}>{placeError}</Text>
                    ) : null}

                    {selectedPlace.address ||
                    typeof selectedPlace.rating === "number" ||
                    typeof selectedPlace.isOpenNow === "boolean" ||
                    route ? (
                      <>
                        {selectedPlace.address ? (
                          <Text
                            style={[
                              styles.sheetAddress,
                              isDark && { color: "rgba(255,255,255,0.7)" },
                            ]}
                            numberOfLines={2}
                          >
                            {selectedPlace.address}
                          </Text>
                        ) : null}

                        <View
                          style={[
                            styles.sheetMetaRow,
                            !selectedPlace.address && { marginTop: 0 },
                          ]}
                        >
                          {typeof selectedPlace.rating === "number" ? (
                            <Text
                              style={[
                                styles.sheetMetaPill,
                                styles.sheetRatingPill,
                                isDark && {
                                  backgroundColor: "rgba(255,255,255,0.1)",
                                  color: "rgba(255,255,255,0.8)",
                                },
                              ]}
                            >
                              ⭐ {selectedPlace.rating.toFixed(1)}
                              {typeof selectedPlace.userRatingsTotal ===
                              "number"
                                ? ` (${formatCount(selectedPlace.userRatingsTotal)})`
                                : ""}
                            </Text>
                          ) : null}
                          {typeof selectedPlace.isOpenNow === "boolean" ? (
                            <Text
                              style={[
                                styles.sheetMetaPill,
                                selectedPlace.isOpenNow
                                  ? styles.openNow
                                  : styles.closedNow,
                              ]}
                            >
                              {selectedPlace.isOpenNow ? "Open now" : "Closed"}
                            </Text>
                          ) : null}
                        </View>

                        {route ? (
                          <Text
                            style={[
                              styles.sheetMeta,
                              isDark && { color: "rgba(255,255,255,0.7)" },
                            ]}
                          >
                            {(() => {
                              const parts = [
                                route.distanceText,
                                route.durationText,
                              ].filter(Boolean);
                              return parts.length
                                ? `Route: ${parts.join(" • ")}`
                                : "Route available";
                            })()}
                          </Text>
                        ) : null}

                        <View style={styles.sheetActionsRow}>
                          <TouchableOpacity
                            style={[
                              styles.sheetActionBtn,
                              styles.nearbyCallBtn,
                              isDark
                                ? {
                                    backgroundColor: "#041424",
                                    borderColor: "rgba(143,211,255,0.4)",
                                  }
                                : {
                                    backgroundColor: "#F5F5F5",
                                    borderColor: theme.border,
                                  },
                            ]}
                            onPress={() => {
                              if (!selectedPlace.phoneNumber) {
                                Alert.alert(
                                  "No phone number",
                                  "This place doesn't have a phone number listed.",
                                );
                                return;
                              }
                              void makePhoneCall(selectedPlace.phoneNumber);
                            }}
                          >
                            <Feather
                              name="phone"
                              size={16}
                              color={isDark ? "#FFFFFF" : theme.text}
                            />
                            <Text
                              style={[
                                styles.sheetActionText,
                                styles.nearbyActionText,
                                { color: isDark ? "#FFFFFF" : theme.text },
                              ]}
                              allowFontScaling={false}
                            >
                              Call
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.sheetActionBtn,
                              styles.nearbyRouteBtn,
                              {
                                backgroundColor: "#3B82F6",
                                borderColor: "#3B82F6",
                              },
                            ]}
                            onPress={() =>
                              void openGoogleMapsDirections({
                                latitude: selectedPlace.latitude,
                                longitude: selectedPlace.longitude,
                              })
                            }
                          >
                            <Feather
                              name="navigation"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text
                              style={[
                                styles.sheetActionText,
                                styles.nearbyActionText,
                                { color: "#FFFFFF" },
                              ]}
                              allowFontScaling={false}
                            >
                              Route
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.sheetActionsRowLine}>
                          <TouchableOpacity
                            style={[
                              styles.sheetActionBtn,
                              styles.nearbyCallBtn,
                              styles.actionRed,
                              !isDark && { backgroundColor: "#FEE2E2" },
                              isDark && {
                                backgroundColor: "rgba(239,68,68,0.2)",
                                borderColor: "rgba(239,68,68,0.3)",
                              },
                            ]}
                            onPress={() => {
                              Alert.alert(
                                "Emergency",
                                "Open Emergency Services?",
                                [
                                  { text: "Cancel", style: "cancel" },
                                  {
                                    text: "Open",
                                    style: "default",
                                    onPress: () => router.push("/(tabs)/extra"),
                                  },
                                ],
                              );
                            }}
                          >
                            <Feather
                              name="alert-triangle"
                              size={16}
                              color={isDark ? "#FF8A80" : "#DC2626"}
                            />
                            <Text
                              style={[
                                styles.sheetActionText,
                                styles.nearbyActionText,
                                { color: "#DC2626" },
                              ]}
                            >
                              SOS
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : null}

                    {selectedPlace.photos?.length ? (
                      <FlatList
                        horizontal
                        data={selectedPlace.photos}
                        keyExtractor={(p) => p.photoReference}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.sheetPhotosRow}
                        renderItem={({ item }) => {
                          const url = getPlacePhotoUrl(
                            item.photoReference,
                            900,
                          );
                          if (!url) return null;
                          return (
                            <ExpoImage
                              source={{ uri: url }}
                              style={styles.sheetPhoto}
                              onError={(e) => {
                                console.error(
                                  "[Place Photo] load error:",
                                  url,
                                  e,
                                );
                              }}
                              contentFit="cover"
                            />
                          );
                        }}
                      />
                    ) : null}

                    {(selectedReviewSummary.rating !== null ||
                      selectedReviewSummary.usedCount > 0) && (
                      <View
                        style={[
                          styles.reviewsCard,
                          isDark && {
                            backgroundColor: "#041424",
                            borderColor: "rgba(143,211,255,0.25)",
                          },
                          !isDark && { borderColor: theme.border },
                        ]}
                      >
                        <View style={styles.reviewsTopRow}>
                          <Text
                            style={[
                              styles.reviewsTitle,
                              isDark && { color: "#FFFFFF" },
                            ]}
                          >
                            Review summary
                          </Text>
                        </View>

                        <View style={styles.reviewsMainRow}>
                          <View style={styles.reviewsRatingBlock}>
                            <Text
                              style={[
                                styles.reviewsRatingValue,
                                isDark && { color: "#FFFFFF" },
                              ]}
                            >
                              {selectedReviewSummary.rating !== null
                                ? selectedReviewSummary.rating.toFixed(1)
                                : "—"}
                            </Text>

                            <View style={styles.reviewsStarsRow}>
                              {Array.from({ length: 5 }).map((_, idx) => {
                                const starIndex = idx + 1;
                                const r =
                                  selectedReviewSummary.rating !== null
                                    ? selectedReviewSummary.rating
                                    : 0;

                                const name =
                                  r >= starIndex
                                    ? "star"
                                    : r >= starIndex - 0.5
                                      ? "star-half"
                                      : "star-outline";

                                return (
                                  <Ionicons
                                    key={starIndex}
                                    name={name as any}
                                    size={18}
                                    color="#FACC15"
                                  />
                                );
                              })}
                            </View>

                            {selectedReviewSummary.totalText ? (
                              <Text
                                style={[
                                  styles.reviewsRatingCount,
                                  isDark && { color: "rgba(255,255,255,0.7)" },
                                ]}
                              >
                                ({selectedReviewSummary.totalText})
                              </Text>
                            ) : null}
                          </View>

                          <View style={styles.reviewsBars}>
                            {([5, 4, 3, 2, 1] as const).map((star) => {
                              const p = selectedReviewSummary.pct(star);
                              return (
                                <View key={star} style={styles.reviewsBarRow}>
                                  <View
                                    style={[
                                      styles.reviewsBarTrack,
                                      isDark && {
                                        backgroundColor:
                                          "rgba(255,255,255,0.14)",
                                      },
                                    ]}
                                  >
                                    <View
                                      style={[
                                        styles.reviewsBarFill,
                                        { width: `${Math.round(p * 100)}%` },
                                      ]}
                                    />
                                  </View>
                                </View>
                              );
                            })}
                          </View>

                          <Ionicons
                            name="information-circle-outline"
                            size={18}
                            color={
                              isDark ? "rgba(255,255,255,0.75)" : "#6B7280"
                            }
                            style={styles.reviewsInfoIcon}
                          />
                        </View>
                      </View>
                    )}

                    {getSafetyNote(selectedPlace.types) ? (
                      <View
                        style={[
                          styles.sheetSafetyCard,
                          isDark && {
                            backgroundColor: "rgba(254,148,0,0.18)",
                            borderColor: "rgba(254,148,0,0.3)",
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.sheetSafetyIcon,
                            isDark && {
                              backgroundColor: "rgba(255,255,255,0.1)",
                            },
                          ]}
                        >
                          <Feather
                            name="shield"
                            size={20}
                            color={isDark ? "#FFA500" : "#1F2937"}
                          />
                        </View>
                        <View style={styles.sheetSafetyTextWrap}>
                          <Text
                            style={[
                              styles.sheetSafetyTitle,
                              isDark && { color: "#FFFFFF" },
                            ]}
                          >
                            Safe zone nearby.
                          </Text>
                          <Text
                            style={[
                              styles.sheetSafetyText,
                              isDark && { color: "rgba(255,255,255,0.7)" },
                            ]}
                            numberOfLines={2}
                          >
                            {getSafetyNote(selectedPlace.types)}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </ScrollView>
              )}
            </View>
          </AnimatedBlurView>
        )}

        {!selectedPlace && nearbyPlaces.length > 0 && (
          <AnimatedBlurView
            intensity={60}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.nearbySheet,
              isDark && { backgroundColor: "rgba(2,18,33,0.7)" },
              !isDark && { backgroundColor: "rgba(255,255,255,0.55)" },
              { height: nearbySheetHeightPx },
              { transform: [{ translateY: nearbySheetTranslateY }] },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View {...nearbySheetPanResponder.panHandlers}>
                <View
                  style={styles.nearbyDragZone}
                  onLayout={(e) => {
                    setNearbyDragZoneHeight(e.nativeEvent.layout.height);
                  }}
                >
                  <View style={styles.nearbyHandle} />
                </View>

                <View
                  style={[
                    styles.nearbyHeaderRow,
                    nearbySheetChipsOnly && {
                      opacity: 0,
                      height: 0,
                      marginBottom: 0,
                      overflow: "hidden",
                    },
                  ]}
                  pointerEvents={nearbySheetChipsOnly ? "none" : "auto"}
                >
                  <View>
                    <Text
                      style={[
                        styles.nearbyTitle,
                        isDark && { color: "#FFFFFF" },
                      ]}
                    >
                      {`Nearby ${
                        POI_CATEGORIES.find((c) => c.key === activePoiKey)
                          ?.label ?? "Places"
                      }`}
                    </Text>
                    <Text
                      style={[
                        styles.nearbySubtitle,
                        isDark && { color: "rgba(255,255,255,0.7)" },
                      ]}
                    >
                      {`${filteredNearbyPlaces.length} places found`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setNearbyPlaces([]);
                      setActivePoiKey(null);
                    }}
                    style={styles.nearbyClose}
                  >
                    <Feather
                      name="x"
                      size={18}
                      color={isDark ? "#8FD3FF" : "#0B253A"}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={[
                    styles.filterRow,
                    nearbySheetChipsOnly && styles.filterRowChipsOnly,
                  ]}
                  contentContainerStyle={styles.filterRowContent}
                  onLayout={(e) => {
                    setNearbyFilterRowHeight(e.nativeEvent.layout.height);
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      sortMode !== "default" && styles.filterChipActive,
                      !isDark && {
                        backgroundColor: "#F3F4F6",
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                      !isDark &&
                        sortMode !== "default" && {
                          borderColor: theme.icon,
                          borderWidth: 2,
                          backgroundColor: "#F3F4F6",
                        },
                    ]}
                    onPress={() => {
                      setSortMode((prev) =>
                        prev === "default" ? "distance" : "default",
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        !isDark && { color: theme.text },
                      ]}
                      allowFontScaling={false}
                    >
                      Sort by distance
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      filterOpenNow && styles.filterChipActive,
                      !isDark && {
                        backgroundColor: "#F3F4F6",
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                      !isDark &&
                        filterOpenNow && {
                          borderColor: theme.icon,
                          borderWidth: 2,
                          backgroundColor: "#F3F4F6",
                        },
                    ]}
                    onPress={toggleOpenNow}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {filterOpenNow && openNowHydrating ? (
                        <ActivityIndicator
                          size="small"
                          color={isDark ? "#8FD3FF" : theme.text}
                          style={{ marginRight: 8 }}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.filterChipText,
                          !isDark && { color: theme.text },
                        ]}
                        allowFontScaling={false}
                      >
                        Open now
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      filterWheelchair && styles.filterChipActive,
                      !isDark && {
                        backgroundColor: "#F3F4F6",
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                      !isDark &&
                        filterWheelchair && {
                          borderColor: theme.icon,
                          borderWidth: 2,
                          backgroundColor: "#F3F4F6",
                        },
                    ]}
                    onPress={toggleWheelchair}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {wheelchairHydrating ? (
                        <ActivityIndicator
                          size="small"
                          color={isDark ? "#8FD3FF" : theme.text}
                          style={{ marginRight: 8 }}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.filterChipText,
                          !isDark && { color: theme.text },
                        ]}
                        allowFontScaling={false}
                      >
                        Wheelchair accessible entrance
                      </Text>
                    </View>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <ScrollView
                style={[
                  styles.nearbyList,
                  nearbySheetChipsOnly && {
                    opacity: 0,
                    height: 0,
                    overflow: "hidden",
                  },
                ]}
                pointerEvents={nearbySheetChipsOnly ? "none" : "auto"}
                scrollEnabled={!nearbySheetChipsOnly}
                nestedScrollEnabled
                decelerationRate="fast"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                onScroll={(e) => {
                  nearbyListScrollYRef.current =
                    e.nativeEvent.contentOffset?.y ?? 0;
                }}
                scrollEventThrottle={16}
              >
                {filteredNearbyPlaces.map((p) => (
                  <View
                    key={p.placeId}
                    style={[
                      styles.nearbyCard,
                      !isDark && {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.nearbyNameRow}>
                      {(() => {
                        const IconComponent = getPoiMarkerIcon(p);
                        return IconComponent ? (
                          <View
                            style={[
                              styles.nearbyPoiBadge,
                              !isDark && styles.poiMarkerLight,
                              isDark && styles.nearbyPoiBadgeDark,
                            ]}
                          >
                            <IconComponent
                              width={14}
                              height={14}
                              fill={isDark ? "#FF2D55" : "#FFFFFF"}
                            />
                          </View>
                        ) : null;
                      })()}

                      <Text
                        style={[
                          styles.nearbyName,
                          isDark && { color: "#FFFFFF" },
                          !isDark && { color: theme.text },
                        ]}
                        numberOfLines={2}
                      >
                        {p.name}
                      </Text>
                    </View>
                    {p.vicinity ? (
                      <Text
                        style={[
                          styles.nearbyAddress,
                          isDark && { color: "rgba(255,255,255,0.7)" },
                          !isDark && { color: theme.icon },
                        ]}
                        numberOfLines={2}
                      >
                        {p.vicinity}
                      </Text>
                    ) : null}

                    <View style={styles.nearbyMetaRow}>
                      <View style={styles.nearbyMetaLeft}>
                        {typeof p.isOpenNow === "boolean" ? (
                          <Text
                            style={[
                              styles.nearbyStatus,
                              p.isOpenNow
                                ? styles.nearbyStatusOpen
                                : styles.nearbyStatusClosed,
                            ]}
                            allowFontScaling={false}
                          >
                            {p.isOpenNow
                              ? "Open"
                              : typeof p.nextOpenTimeText === "string"
                                ? `Closed • Opens ${p.nextOpenTimeText}`
                                : "Closed"}
                          </Text>
                        ) : null}

                        {typeof p.rating === "number" ? (
                          <Text
                            style={[
                              styles.nearbyRating,
                              !isDark && { color: theme.text },
                            ]}
                            numberOfLines={1}
                          >
                            ⭐ {p.rating.toFixed(1)}
                            {typeof p.userRatingsTotal === "number"
                              ? ` (${formatCount(p.userRatingsTotal)})`
                              : ""}
                          </Text>
                        ) : null}
                      </View>
                      {hasAccurateLocationForDistance && (
                        <Text
                          style={[
                            styles.nearbyDistance,
                            !isDark && { color: theme.icon },
                          ]}
                        >
                          {formatDistance(
                            distanceMeters(coords, {
                              latitude: p.latitude,
                              longitude: p.longitude,
                            }),
                          )}{" "}
                          away
                        </Text>
                      )}
                    </View>

                    <View style={styles.nearbyActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.sheetActionBtn,
                          styles.nearbyCallBtn,
                          isDark
                            ? {
                                backgroundColor: "#041424",
                                borderColor: "rgba(143,211,255,0.4)",
                              }
                            : {
                                backgroundColor: "#F5F5F5",
                                borderColor: theme.border,
                              },
                        ]}
                        onPress={async () => {
                          setNearbyLoadingPlaceId(p.placeId + "-call");
                          try {
                            const details = await getPlaceDetails(p.placeId);
                            if (details?.phoneNumber) {
                              await makePhoneCall(details.phoneNumber);
                            } else {
                              Alert.alert(
                                "No phone number",
                                "This place doesn't have a phone number listed.",
                              );
                            }
                          } finally {
                            setNearbyLoadingPlaceId(null);
                          }
                        }}
                        disabled={nearbyLoadingPlaceId === p.placeId + "-call"}
                      >
                        {nearbyLoadingPlaceId === p.placeId + "-call" ? (
                          <ActivityIndicator
                            size="small"
                            color={isDark ? "#FFFFFF" : theme.text}
                          />
                        ) : (
                          <>
                            <Feather
                              name="phone"
                              size={16}
                              color={isDark ? "#FFFFFF" : theme.text}
                            />
                            <Text
                              style={[
                                styles.sheetActionText,
                                styles.nearbyActionText,
                                { color: isDark ? "#FFFFFF" : theme.text },
                              ]}
                              allowFontScaling={false}
                            >
                              Call
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.sheetActionBtn,
                          styles.nearbyRouteBtn,
                          {
                            backgroundColor: "#3B82F6",
                            borderColor: "#3B82F6",
                          },
                        ]}
                        onPress={async () => {
                          setNearbyLoadingPlaceId(p.placeId + "-map");
                          try {
                            await openGoogleMapsDirections({
                              latitude: p.latitude,
                              longitude: p.longitude,
                            });
                          } finally {
                            setNearbyLoadingPlaceId(null);
                          }
                        }}
                        disabled={nearbyLoadingPlaceId === p.placeId + "-map"}
                      >
                        {nearbyLoadingPlaceId === p.placeId + "-map" ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Feather
                              name="navigation"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text
                              style={[
                                styles.sheetActionText,
                                styles.nearbyActionText,
                                { color: "#FFFFFF" },
                              ]}
                              allowFontScaling={false}
                            >
                              Route
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </AnimatedBlurView>
        )}
      </View>

      {locationDenied && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Location is disabled — showing Sri Lanka.
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#FF0000" />
        </View>
      )}

      {/* Search History Modal */}
      <Modal
        visible={showSearchHistory}
        animationType="none"
        onRequestClose={() => {
          setShowSearchHistory(false);
        }}
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.historyModalContainer}>
          <View style={styles.historyHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowSearchHistory(false);
              }}
              style={styles.historyBackButton}
              activeOpacity={0.5}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather name="arrow-left" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.historyTitle}>Recent searches</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.historyContent}>
            {(() => {
              const { today, yesterday, thisWeek, lastWeek, older } =
                categorizeSearchHistory();

              return (
                <>
                  {today.length > 0 && (
                    <View style={styles.historySection}>
                      <Text style={styles.historySectionTitle}>Today</Text>
                      {today.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.historyItem}
                          onPress={async () => {
                            setShowSearchHistory(false);
                            setQuery(item.query);
                            if (item.placeId) {
                              const details = await selectPlaceById(
                                item.placeId,
                                {
                                  placeId: item.placeId,
                                  name: item.query,
                                  latitude: mapRegion.latitude,
                                  longitude: mapRegion.longitude,
                                  address: item.address,
                                },
                              );
                              if (details) moveToPlace(details);
                            }
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={24}
                            color="#666"
                            style={styles.historyIcon}
                          />
                          <View style={styles.historyTextContainer}>
                            <Text style={styles.historyQueryText}>
                              {item.query}
                            </Text>
                            {item.address && (
                              <Text style={styles.historyAddressText}>
                                {item.address}
                              </Text>
                            )}
                            {item.isOpen !== undefined && (
                              <Text
                                style={[
                                  styles.historyStatusText,
                                  item.isOpen && styles.historyStatusOpen,
                                ]}
                              >
                                {item.isOpen
                                  ? "Open 24 hours"
                                  : `Closes ${new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {yesterday.length > 0 && (
                    <View style={styles.historySection}>
                      <Text style={styles.historySectionTitle}>Yesterday</Text>
                      {yesterday.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.historyItem}
                          onPress={async () => {
                            setShowSearchHistory(false);
                            setQuery(item.query);
                            if (item.placeId) {
                              const details = await selectPlaceById(
                                item.placeId,
                                {
                                  placeId: item.placeId,
                                  name: item.query,
                                  latitude: mapRegion.latitude,
                                  longitude: mapRegion.longitude,
                                  address: item.address,
                                },
                              );
                              if (details) moveToPlace(details);
                            }
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={24}
                            color="#666"
                            style={styles.historyIcon}
                          />
                          <View style={styles.historyTextContainer}>
                            <Text style={styles.historyQueryText}>
                              {item.query}
                            </Text>
                            {item.address && (
                              <Text style={styles.historyAddressText}>
                                {item.address}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {thisWeek.length > 0 && (
                    <View style={styles.historySection}>
                      <Text style={styles.historySectionTitle}>This week</Text>
                      {thisWeek.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.historyItem}
                          onPress={async () => {
                            setShowSearchHistory(false);
                            setQuery(item.query);
                            if (item.placeId) {
                              const details = await selectPlaceById(
                                item.placeId,
                                {
                                  placeId: item.placeId,
                                  name: item.query,
                                  latitude: mapRegion.latitude,
                                  longitude: mapRegion.longitude,
                                  address: item.address,
                                },
                              );
                              if (details) moveToPlace(details);
                            }
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={24}
                            color="#666"
                            style={styles.historyIcon}
                          />
                          <View style={styles.historyTextContainer}>
                            <Text style={styles.historyQueryText}>
                              {item.query}
                            </Text>
                            {item.address && (
                              <Text style={styles.historyAddressText}>
                                {item.address}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {lastWeek.length > 0 && (
                    <View style={styles.historySection}>
                      <Text style={styles.historySectionTitle}>Last week</Text>
                      {lastWeek.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.historyItem}
                          onPress={async () => {
                            setShowSearchHistory(false);
                            setQuery(item.query);
                            if (item.placeId) {
                              const details = await selectPlaceById(
                                item.placeId,
                                {
                                  placeId: item.placeId,
                                  name: item.query,
                                  latitude: mapRegion.latitude,
                                  longitude: mapRegion.longitude,
                                  address: item.address,
                                },
                              );
                              if (details) moveToPlace(details);
                            }
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={24}
                            color="#666"
                            style={styles.historyIcon}
                          />
                          <View style={styles.historyTextContainer}>
                            <Text style={styles.historyQueryText}>
                              {item.query}
                            </Text>
                            {item.address && (
                              <Text style={styles.historyAddressText}>
                                {item.address}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {older.length > 0 && (
                    <View style={styles.historySection}>
                      <Text style={styles.historySectionTitle}>
                        Previous searches
                      </Text>
                      {older.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.historyItem}
                          onPress={async () => {
                            setShowSearchHistory(false);
                            setQuery(item.query);
                            if (item.placeId) {
                              const details = await selectPlaceById(
                                item.placeId,
                                {
                                  placeId: item.placeId,
                                  name: item.query,
                                  latitude: mapRegion.latitude,
                                  longitude: mapRegion.longitude,
                                  address: item.address,
                                },
                              );
                              if (details) moveToPlace(details);
                            }
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={24}
                            color="#666"
                            style={styles.historyIcon}
                          />
                          <View style={styles.historyTextContainer}>
                            <Text style={styles.historyQueryText}>
                              {item.query}
                            </Text>
                            {item.address && (
                              <Text style={styles.historyAddressText}>
                                {item.address}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {searchHistory.length === 0 && (
                    <View style={styles.emptyHistoryContainer}>
                      <Ionicons name="time-outline" size={64} color="#ccc" />
                      <Text style={styles.emptyHistoryText}>
                        No recent searches
                      </Text>
                    </View>
                  )}
                </>
              );
            })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  floatingShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  floatingShadowStrong: {
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  searchBarShadow: {
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          // Slightly stronger bottom shadow to lift the bar off the map.
          shadowOpacity: 0.24,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
        }
      : {
          // Small elevation for Android separation.
          elevation: 3,
        }),
  },
  container: {
    flex: 1,
    backgroundColor: "#0B253A",
  },
  mapWrap: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchWrap: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputContainer: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#031B2E",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    fontSize: 17,
    fontWeight: "400",
    lineHeight: 22,
    color: "#fff",
    paddingVertical: 4,
  },
  searchInputFocused: {
    borderColor: "#8FD3FF",
  },
  toggleActive: {
    backgroundColor: "#031B2E",
    borderWidth: 2,
    borderColor: "#8FD3FF",
  },
  poiRow: {
    paddingTop: 8,
    paddingHorizontal: 2,
    gap: 6,
  },
  poiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(3,27,46,0.95)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 38,
    borderWidth: 1.5,
    borderColor: "rgba(143,211,255,0.7)",
  },
  poiChipActive: {
    borderColor: "#8FD3FF",
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  poiChipText: {
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
    lineHeight: 18,
    includeFontPadding: true,
  },
  poiChipTextActive: {
    color: "#fff",
  },
  poiMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E11D48",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  poiMarkerDark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0B253A",
    borderWidth: 2.5,
    borderColor: "#FF2D55",
  },
  poiMarkerLight: {
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  liveLocationPinWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  liveLocationPinBack: {
    position: "absolute",
    bottom: 0,
  },
  liveLocationPinFront: {
    position: "absolute",
    bottom: 1,
  },
  liveLocationNeonWrapDark: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  liveLocationNeonGlow1Dark: {
    position: "absolute",
    top: -6,
    left: -6,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,244,79,0.18)",
  },
  liveLocationNeonGlow2Dark: {
    position: "absolute",
    top: -12,
    left: -12,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,244,79,0.12)",
  },
  liveLocationNeonGlow3Dark: {
    position: "absolute",
    top: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,244,79,0.08)",
  },
  liveLocationNeonPinWrapDark: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "flex-end",
    shadowColor: "#FFF44F",
    shadowOpacity: 0.95,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  liveLocationNeonPinBackDark: {
    position: "absolute",
    bottom: -2,
  },
  liveLocationNeonPinFrontDark: {
    position: "absolute",
    bottom: -1,
  },
  suggestions: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    maxHeight: 260,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  suggestionLoading: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "rgba(0,0,0,0.55)",
    fontSize: 12,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  suggestionText: {
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "#5F6368",
    fontSize: 17,
    fontWeight: "400",
    lineHeight: 22,
  },
  loadingOverlay: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 20,
    elevation: 5,
  },
  loadingText: {
    marginTop: 6,
    color: "#111",
    fontSize: 12,
    textAlign: "center",
  },
  banner: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bannerText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    // Keep the sheet above the bottom tab bar.
    bottom: 84,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    padding: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: "#D1D5DB",
    marginBottom: 12,
  },
  sheetInnerBox: {
    backgroundColor: "#06243F",
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: "rgba(143,211,255,0.25)",
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetAddress: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "#6B7280",
  },
  sheetInfoCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(143,211,255,0.25)",
  },
  sheetInfoCardDark: {
    backgroundColor: "rgba(26,59,84,0.7)",
    borderColor: "rgba(143,211,255,0.25)",
  },
  sheetLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
  },
  sheetLoadingText: {
    fontSize: 12,
    color: "rgba(0,0,0,0.6)",
    fontWeight: "600",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
  },
  sheetErrorText: {
    marginBottom: 8,
    color: "rgba(185,28,28,0.95)",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
  },
  sheetPhotosRow: {
    gap: 8,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sheetPhotosEmpty: {
    paddingBottom: 10,
    color: "rgba(0,0,0,0.55)",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
  },
  sheetPhoto: {
    width: 260,
    height: 150,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  reviewsCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reviewsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "#111827",
  },
  reviewsAddReview: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "#8FD3FF",
  },
  reviewsMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  reviewsRatingBlock: {
    width: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewsRatingValue: {
    fontSize: 40,
    fontWeight: "700",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "#111827",
    lineHeight: 44,
  },
  reviewsStarsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  reviewsRatingCount: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "#6B7280",
    textAlign: "center",
  },
  reviewsBars: {
    flex: 1,
    gap: 6,
  },
  reviewsBarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewsBarTrack: {
    flex: 1,
    maxWidth: 140,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  reviewsBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FACC15",
  },
  reviewsInfoIcon: {
    marginLeft: 6,
  },
  reviewsDisclaimer: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "rgba(255,255,255,0.65)",
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "600",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "#111827",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  sheetSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "#6B7280",
  },
  sheetMeta: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "rgba(0,0,0,0.6)",
  },
  sheetMetaRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetMetaPill: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "rgba(0,0,0,0.75)",
    overflow: "hidden",
  },
  sheetRatingPill: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  openNow: {
    backgroundColor: "#D1FAE5",
    color: "#047857",
    fontSize: 13,
    fontWeight: "500",
  },
  closedNow: {
    backgroundColor: "rgba(239,68,68,0.12)",
    color: "#991B1B",
  },
  sheetActionsRow: {
    marginTop: 16,
    gap: 16,
  },
  sheetActionsRowLine: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  sheetActionBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 4 },
        }
      : {
          elevation: 4,
        }),
  },
  nearbyCallBtn: {
    borderRadius: 12,
    height: 44,
    minHeight: 44,
    paddingVertical: 0,
  },
  nearbyRouteBtn: {
    borderRadius: 12,
    height: 44,
    minHeight: 44,
    paddingVertical: 0,
  },
  sheetActionText: {
    color: "#0B253A",
    fontWeight: "800",
    fontSize: 12,
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
  },
  actionNeutral: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  actionBlue: {
    backgroundColor: "rgba(47,111,237,0.14)",
  },
  actionRed: {
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  actionGreen: {
    backgroundColor: "rgba(34,197,94,0.16)",
  },
  sheetSafetyCard: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(254,148,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(254,148,0,0.18)",
  },
  sheetSafetyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSafetyTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  sheetSafetyTitle: {
    color: "#1F2937",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
  },
  sheetSafetyText: {
    marginTop: 4,
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "400",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
  },
  nearbySheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(2,18,33,0.6)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  nearbyDragZone: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  nearbyHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    marginBottom: 8,
  },
  nearbyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  nearbyTitle: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "#0B253A",
  },
  nearbySubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "rgba(11,37,58,0.7)",
  },
  nearbySubtitleStrong: {
    fontWeight: "700",
  },
  nearbyClose: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyList: {
    marginTop: 0,
    paddingTop: 0,
  },
  nearbyCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#06243F",
    borderWidth: 1,
    borderColor: "rgba(143,211,255,0.25)",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        }
      : {
          elevation: 7,
        }),
  },
  nearbyIndex: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  nearbyName: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "#FFFFFF",
  },
  nearbyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nearbyPoiBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E11D48",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    flexShrink: 0,
  },
  nearbyPoiBadgeDark: {
    backgroundColor: "#0B253A",
    borderColor: "#FF2D55",
  },
  nearbyAddress: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "400",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "rgba(255,255,255,0.7)",
  },
  nearbyMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  nearbyMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  nearbyRating: {
    fontSize: 13,
    color: "#FFE082",
    fontWeight: "500",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    flexShrink: 1,
    minWidth: 0,
  },
  nearbyStatus: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    flexShrink: 0,
  },
  nearbyStatusOpen: {
    color: "#4ADE80",
  },
  nearbyStatusClosed: {
    color: "#FF8A80",
  },
  nearbyDistance: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    color: "rgba(255,255,255,0.8)",
  },
  nearbyActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  filterRow: {
    marginTop: 0,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  filterRowChipsOnly: {
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 0,
    height: 48,
  },
  filterRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  filterChip: {
    minWidth: 80,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(6,28,46,0.4)",
    borderWidth: 2.2,
    borderColor: "#BCEBFF",
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: "rgba(143,211,255,0.3)",
    borderColor: "#FFFFFF",
    borderWidth: 3,
  },
  filterChipText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
    fontFamily: LEGIBLE_SANS_FONT_FAMILY,
    textAlign: "center",
    lineHeight: 16,
    includeFontPadding: true,
    textAlignVertical: "center",
    letterSpacing: 0.1,
    opacity: 1,
  },
  nearbyActionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  voiceButton: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  historyModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  historyBackButton: {
    padding: 12,
    marginLeft: -4,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  historyContent: {
    flex: 1,
  },
  historySection: {
    paddingTop: 16,
  },
  historySectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  historyIcon: {
    marginRight: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    padding: 8,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyQueryText: {
    fontSize: 16,
    color: "#000",
    marginBottom: 2,
  },
  historyAddressText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  historyStatusText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  historyStatusOpen: {
    color: "#0F9D58",
  },
  emptyHistoryContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
});
