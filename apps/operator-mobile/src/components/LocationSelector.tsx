import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { MapPressEvent, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '@theme';
import Constants from 'expo-constants';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationSelectorProps {
  value?: Coordinates | null;
  radiusKm: number;
  onChange: (coordinates: Coordinates) => void;
}

const DEFAULT_REGION: Region = {
  latitude: -33.4489,
  longitude: -70.6693,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

const computeDelta = (radiusKm: number) => {
  const km = Math.max(radiusKm, 5);
  const delta = km / 111;
  return Math.min(Math.max(delta * 1.8, 0.05), 2);
};

const shouldDisableMap = Platform.OS === 'android' && Constants.appOwnership === 'standalone';
type MapsModule = typeof import('react-native-maps');
let MapViewComponent: MapsModule['default'] | null = null;
let MarkerComponent: MapsModule['Marker'] | null = null;
let CircleComponent: MapsModule['Circle'] | null = null;

if (!shouldDisableMap) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const maps: MapsModule = require('react-native-maps');
  MapViewComponent = maps.default;
  MarkerComponent = maps.Marker;
  CircleComponent = maps.Circle;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ value, radiusKm, onChange }) => {
  const { colors } = useTheme();
  const [locating, setLocating] = useState(false);
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);

  const initialRegion = useMemo<Region>(() => {
    if (value) {
      const delta = computeDelta(radiusKm);
      return {
        latitude: value.latitude,
        longitude: value.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      };
    }
    return DEFAULT_REGION;
  }, [radiusKm, value]);

  const [region, setRegion] = useState<Region>(initialRegion);

  useEffect(() => {
    if (value) {
      const delta = computeDelta(radiusKm);
      setRegion((prev) => ({
        ...prev,
        latitude: value.latitude,
        longitude: value.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      }));
    }
  }, [radiusKm, value]);

  const handleMapPress = useCallback(
    (event: MapPressEvent) => {
      const coordinate = event.nativeEvent.coordinate;
      setRegion((prev) => ({ ...prev, latitude: coordinate.latitude, longitude: coordinate.longitude }));
      onChange(coordinate);
      setPermissionWarning(null);
    },
    [onChange]
  );

  const handleUseCurrentLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setPermissionWarning('Sin permisos para acceder a la ubicación. Revisa los ajustes del sistema.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinate = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      const delta = computeDelta(radiusKm);
      setRegion({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      });
      onChange(coordinate);
      setPermissionWarning(null);
    } catch (err) {
      console.warn('Use current location failed', err);
      setPermissionWarning('No pudimos obtener tu ubicación. Intenta nuevamente.');
    } finally {
      setLocating(false);
    }
  }, [onChange, radiusKm]);

  const radiusMeters = Math.max(radiusKm, 1) * 1000;

  return (
    <View style={[styles.wrapper, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
      {shouldDisableMap || !MapViewComponent ? (
        <View style={styles.mapFallback}>
          <Ionicons name="map-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.fallbackTitle, { color: colors.textPrimary }]}>Mapa no disponible en esta build</Text>
          <Text style={[styles.fallbackDescription, { color: colors.textSecondary }]}>
            Próximamente podrás seleccionar la ubicación desde el mapa. Mientras tanto, usa tu ubicación actual para
            guardar el punto base.
          </Text>
        </View>
      ) : (
        <MapViewComponent
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
        >
          {value ? (
            <>
              {MarkerComponent ? <MarkerComponent coordinate={value} /> : null}
              {CircleComponent ? (
                <CircleComponent
                  key={`${radiusMeters}-${value.latitude}-${value.longitude}`}
                  center={value}
                  radius={radiusMeters}
                  strokeColor={colors.map.radiusStroke}
                  fillColor={colors.map.radiusFill}
                />
              ) : null}
            </>
          ) : null}
        </MapViewComponent>
      )}
      <View style={[styles.controls, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleUseCurrentLocation}
          disabled={locating}
          activeOpacity={0.85}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primaryOn} />
          ) : (
            <>
              <Ionicons name="locate" size={16} color={colors.primaryOn} />
              <Text style={[styles.actionLabel, { color: colors.primaryOn }]}>Usar ubicación actual</Text>
            </>
          )}
        </TouchableOpacity>
        {permissionWarning ? <Text style={[styles.warning, { color: colors.warning }]}>{permissionWarning}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: {
    height: 220,
  },
  mapFallback: {
    height: 220,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  fallbackTitle: {
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
  fallbackDescription: {
    fontSize: 13,
    textAlign: 'center',
  },
  controls: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: 'transparent',
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionLabel: {
    fontWeight: '600',
  },
  warning: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default LocationSelector;
