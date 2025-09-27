package com.skyterra.android.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun SkyTerraTopBar(
    onSearchTapped: () -> Unit,
    onMenuTapped: () -> Unit
) {
    Surface(color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onMenuTapped) {
                Icon(imageVector = Icons.Outlined.Menu, contentDescription = "Abrir menu")
            }
            Text(
                text = "SkyTerra",
                style = MaterialTheme.typography.titleMedium
            )
            IconButton(onClick = onSearchTapped) {
                Icon(imageVector = Icons.Outlined.Search, contentDescription = "Buscar")
            }
        }
    }
}
