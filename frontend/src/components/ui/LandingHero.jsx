import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import AISearchBar from './AISearchBar';
import config from '../../config/environment';
import './LandingHero.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const defaultCenter = [-3, 20];
const defaultZoom = 2.2;

const LandingHero = ({
  onDismiss,
  onSearch,
  onLocationSearch,
  onSearchStart,
  onSearchComplete,
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const lastFlyTargetRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return undefined;

    mapboxgl.accessToken = config.mapbox.accessToken || '';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: config.mapbox.style,
      center: defaultCenter,
      zoom: defaultZoom,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      projection: 'globe',
    });

    mapInstanceRef.current = map;

    const handleResize = () => {
      try {
        map.resize();
      } catch (error) {
        console.warn('No se pudo recalcular el tamaño del mapa del hero:', error);
      }
    };

    map.on('load', () => {
      try {
        map.easeTo({ duration: 0 });
      } catch (error) {
        console.warn('No se pudo ajustar el estado inicial del mapa del hero:', error);
      }
      try {
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }), 'bottom-right');
      } catch (error) {
        console.warn('No se pudo agregar el control de navegación al hero:', error);
      }
      handleResize();
    });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        map.remove();
      } catch (error) {
        console.warn('No se pudo limpiar el mapa del hero:', error);
      }
      mapInstanceRef.current = null;
    };
  }, []);

  const forwardDismiss = (reason, payload) => {
    if (typeof onDismiss === 'function') {
      onDismiss(reason, payload);
    }
  };

  const handleExplore = () => {
    const map = mapInstanceRef.current;
    if (!map) {
      forwardDismiss('explore');
      return;
    }

    const centerObj = map.getCenter();
    const target = {
      center: [centerObj.lng, centerObj.lat],
      zoom: Math.min(map.getZoom() + 2.5, 8),
      pitch: 0,
      bearing: 0,
      duration: 1400,
    };

    lastFlyTargetRef.current = target;

    try {
      map.flyTo({
        center: target.center,
        zoom: target.zoom,
        speed: 0.8,
        curve: 1.6,
        easing: (t) => t,
      });
    } catch (error) {
      console.warn('No se pudo animar el mapa del hero al explorar:', error);
    }

    if (typeof onLocationSearch === 'function') {
      onLocationSearch(target);
    }

    setTimeout(() => {
      forwardDismiss('explore', target);
    }, 900);
  };

  const handleHeroLocationSearch = (locationData) => {
    if (locationData && Array.isArray(locationData.center)) {
      lastFlyTargetRef.current = {
        center: locationData.center,
        zoom: locationData.zoom ?? mapInstanceRef.current?.getZoom?.() ?? 6,
        pitch: locationData.pitch ?? 0,
        bearing: locationData.bearing ?? 0,
        duration: 1400,
      };

      try {
        mapInstanceRef.current?.flyTo({
          center: locationData.center,
          zoom: lastFlyTargetRef.current.zoom,
          pitch: locationData.pitch ?? mapInstanceRef.current?.getPitch?.() ?? 0,
          bearing: locationData.bearing ?? mapInstanceRef.current?.getBearing?.() ?? 0,
          speed: 0.9,
          curve: 1.6,
          easing: (t) => t,
        });
      } catch (error) {
        console.warn('Error al hacer flyTo en el hero:', error);
      }
    }

    if (typeof onLocationSearch === 'function') {
      onLocationSearch(locationData);
    }
  };

  const handleHeroSearchStart = (query) => {
    if (typeof onSearchStart === 'function') {
      onSearchStart(query);
    }
  };

  const handleHeroSearchComplete = (result) => {
    if (typeof onSearchComplete === 'function') {
      onSearchComplete(result);
    }

    if (!result || result.type === 'error') {
      return;
    }

    const flyPayload = result.flyToLocation
      ? {
          center: result.flyToLocation.center,
          zoom: result.flyToLocation.zoom ?? 6,
          pitch: result.flyToLocation.pitch ?? 0,
          bearing: result.flyToLocation.bearing ?? 0,
          duration: 1600,
        }
      : lastFlyTargetRef.current;

    if (flyPayload) {
      lastFlyTargetRef.current = flyPayload;
    }

    setTimeout(() => {
      forwardDismiss('search', flyPayload);
    }, 650);
  };

  return (
    <section className="hero">
      <div className="hero__left">
        <h1>
          Vende
          <br />
          informado
        </h1>
        <button id="ctaExplore" className="btn" type="button" onClick={handleExplore}>
          Explorar
        </button>
      </div>

      <div className="hero__right">
        <div id="map" ref={mapContainerRef} />
        <div className="map-fade" />
      </div>

      <AISearchBar
        variant="hero"
        onSearch={onSearch}
        onLocationSearch={handleHeroLocationSearch}
        onSearchStart={handleHeroSearchStart}
        onSearchComplete={handleHeroSearchComplete}
      />
    </section>
  );
};

export default LandingHero;
