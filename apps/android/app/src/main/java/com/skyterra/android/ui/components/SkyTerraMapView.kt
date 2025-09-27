package com.skyterra.android.ui.components

import android.location.Location
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import com.mapbox.geojson.Point
import com.mapbox.maps.MapAnimationOptions
import com.mapbox.maps.Style
import com.mapbox.maps.extension.compose.MapboxMap
import com.mapbox.maps.extension.compose.annotation.generated.CircleAnnotationGroup
import com.mapbox.maps.extension.compose.annotation.generated.CircleAnnotationOptions
import com.mapbox.maps.extension.compose.camera.CameraOptions
import com.mapbox.maps.extension.compose.camera.MapViewportState
import com.mapbox.maps.extension.compose.camera.rememberMapViewportState
import com.mapbox.maps.extension.compose.gestures.gesturesSettings
import com.mapbox.maps.extension.compose.style.rememberStyleState
import com.skyterra.android.BuildConfig
import com.skyterra.android.model.Property
import com.skyterra.android.model.point

@Composable
fun SkyTerraMapView(
    properties: List<Property>,
    selectedProperty: Property?,
    onFocusProperty: (Property) -> Unit
) {
    val initialPoint = selectedProperty?.point ?: properties.firstOrNull()?.point ?: Point.fromLngLat(-70.66, -33.45)

    val mapViewportState: MapViewportState = rememberMapViewportState {
        setCameraOptions(
            CameraOptions.Builder()
                .center(initialPoint)
                .zoom(13.0)
                .pitch(55.0)
                .bearing(0.0)
                .build()
        )
    }

    val styleState = rememberStyleState(style = BuildConfig.MAPBOX_STYLE_URI.ifBlank { Style.DARK })

    LaunchedEffect(selectedProperty?.id) {
        selectedProperty?.let { property ->
            mapViewportState.easeTo(
                CameraOptions.Builder()
                    .center(property.point)
                    .zoom(15.0)
                    .pitch(55.0)
                    .build(),
                MapAnimationOptions.mapAnimationOptions { duration(750L) }
            )
        }
    }

    MapboxMap(
        modifier = Modifier.fillMaxSize(),
        mapViewportState = mapViewportState,
        styleState = styleState,
        gesturesSettings = gesturesSettings {
            rotateEnabled = true
            pitchEnabled = true
        },
        onMapIdle = {
            val center = mapViewportState.cameraState.center
            val nearest = properties.minByOrNull { it.distanceTo(center) }
            nearest?.let { onFocusProperty(it) }
        },
        onMapClick = { point ->
            val nearest = properties.minByOrNull { it.distanceTo(point) }
            nearest?.let { onFocusProperty(it) }
            true
        }
    ) {
        CircleAnnotationGroup(
            annotations = properties.map { property ->
                val isSelected = property.id == selectedProperty?.id
                CircleAnnotationOptions()
                    .withPoint(property.point)
                    .withCircleRadius(if (isSelected) 9.0 else 7.0)
                    .withCircleColor(if (isSelected) "#38BDF8" else "#CBD5F5")
                    .withCircleOpacity(0.85)
            }
        )
    }
}

private fun Property.distanceTo(point: Point): Double {
    val result = FloatArray(1)
    android.location.Location.distanceBetween(
        latitude,
        longitude,
        point.latitude(),
        point.longitude(),
        result
    )
    return result.firstOrNull()?.toDouble() ?: Double.MAX_VALUE
}
