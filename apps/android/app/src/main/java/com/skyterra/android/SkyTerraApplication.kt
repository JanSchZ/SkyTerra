package com.skyterra.android

import android.app.Application
import com.mapbox.maps.ResourceOptionsManager

class SkyTerraApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        val token = BuildConfig.MAPBOX_ACCESS_TOKEN
        if (token.isNotBlank()) {
            ResourceOptionsManager.getDefault(this, token)
        }
    }
}
