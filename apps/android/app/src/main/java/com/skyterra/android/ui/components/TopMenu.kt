package com.skyterra.android.ui.components

import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

@Composable
fun TopMenu(
    expanded: Boolean,
    onDismiss: () -> Unit,
    onNavigate: (String) -> Unit
) {
    DropdownMenu(expanded = expanded, onDismissRequest = onDismiss) {
        listOf("Guardados", "Dashboard", "Suscripcion", "Cuenta").forEach { destination ->
            DropdownMenuItem(
                text = { Text(destination) },
                onClick = {
                    onNavigate(destination)
                    onDismiss()
                }
            )
        }
    }
}
