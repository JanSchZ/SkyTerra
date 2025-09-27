package com.skyterra.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColors = darkColorScheme(
    primary = SkyBlue,
    secondary = Emerald,
    background = Midnight,
    surface = Midnight,
    onPrimary = Midnight,
    onSecondary = Midnight,
    onBackground = SkyBlue.copy(alpha = 0.1f),
    onSurface = SkyBlue
)

private val LightColors = lightColorScheme(
    primary = SkyBlue,
    secondary = Emerald
)

@Composable
fun SkyTerraTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkColors else LightColors

    MaterialTheme(
        colorScheme = colors,
        typography = Typography,
        content = content
    )
}
