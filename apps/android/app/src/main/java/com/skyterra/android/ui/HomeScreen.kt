package com.skyterra.android.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.skyterra.android.model.Property
import com.skyterra.android.ui.components.PropertyBottomSheet
import com.skyterra.android.ui.components.SearchDialog
import com.skyterra.android.ui.components.SkyTerraMapView
import com.skyterra.android.ui.components.SkyTerraTopBar
import com.skyterra.android.ui.components.TopMenu

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen() {
    var selectedProperty by remember { mutableStateOf<Property?>(null) }
    val properties = remember { Property.mockProperties() }
    var menuExpanded by remember { mutableStateOf(false) }
    var searchVisible by remember { mutableStateOf(false) }
    var showSavedPlaceholder by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            Box {
                SkyTerraTopBar(
                    onSearchTapped = { searchVisible = true },
                    onMenuTapped = { menuExpanded = true }
                )
                TopMenu(
                    expanded = menuExpanded,
                    onDismiss = { menuExpanded = false },
                    onNavigate = { destination ->
                        menuExpanded = false
                        showSavedPlaceholder = destination == "Guardados"
                    }
                )
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize()) {
            SkyTerraMapView(
                properties = properties,
                selectedProperty = selectedProperty,
                onFocusProperty = { if (selectedProperty?.id != it.id) selectedProperty = it }
            )

            Column(modifier = Modifier.padding(padding)) {
                Spacer(modifier = Modifier.height(12.dp))
                PropertyBottomSheet(
                    properties = properties,
                    selectedProperty = selectedProperty,
                    onPropertySelected = { selectedProperty = it }
                )
            }
        }

        if (searchVisible) {
            SearchDialog(onDismiss = { searchVisible = false })
        }

        if (showSavedPlaceholder) {
            ModalBottomSheet(onDismissRequest = { showSavedPlaceholder = false }) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text(text = "Seccion Guardados", style = MaterialTheme.typography.titleLarge)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = "Aqui mostraremos las propiedades guardadas por el usuario.")
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}
