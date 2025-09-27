package com.skyterra.android

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.skyterra.android.ui.HomeScreen
import com.skyterra.android.ui.theme.SkyTerraTheme

@Composable
fun SkyTerraRoot() {
    SkyTerraTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            HomeScreen()
        }
    }
}
