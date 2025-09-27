package com.skyterra.android.model

import com.mapbox.geojson.Point

data class Property(
    val id: String,
    val title: String,
    val address: String,
    val price: Long,
    val area: Int,
    val latitude: Double,
    val longitude: Double
) {
    val priceFormatted: String
        get() = "${price.toString().chunked(3).joinToString(".")} CLP"

    companion object {
        fun mockProperties(): List<Property> = listOf(
            Property(
                id = "prop-1",
                title = "Casa moderna en Vitacura",
                address = "Av. Alonso de Cordova 3456",
                price = 520_000_000,
                area = 280,
                latitude = -33.395,
                longitude = -70.587
            ),
            Property(
                id = "prop-2",
                title = "Departamento vista parque",
                address = "Las Condes 1122",
                price = 320_000_000,
                area = 95,
                latitude = -33.404,
                longitude = -70.571
            ),
            Property(
                id = "prop-3",
                title = "Parcela de agrado Chicureo",
                address = "Camino Los Ingleses",
                price = 640_000_000,
                area = 5000,
                latitude = -33.289,
                longitude = -70.671
            )
        )
    }
}

val Property.point: Point
    get() = Point.fromLngLat(longitude, latitude)
