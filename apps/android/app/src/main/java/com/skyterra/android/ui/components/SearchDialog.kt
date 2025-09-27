package com.skyterra.android.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember

@Composable
fun SearchDialog(onDismiss: () -> Unit) {
    val queryState = remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(onClick = onDismiss) {
                Text("Buscar")
            }
        },
        dismissButton = {
            Button(onClick = onDismiss) {
                Text("Cerrar")
            }
        },
        title = { Text("Buscar con Sam") },
        text = {
            OutlinedTextField(
                value = queryState.value,
                onValueChange = { queryState.value = it },
                label = { Text("Ej: Casas con vista en Vitacura") }
            )
        }
    )
}
