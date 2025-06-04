package com.skyterra.android.ui.map

import android.graphics.BitmapFactory
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
        import android.graphics.BitmapFactory
        import android.os.Bundle // For Bundle if not using Safe Args
        import android.view.LayoutInflater
        import android.view.View
        import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels // Use activityViewModels if sharing with other fragments
        import androidx.navigation.fragment.findNavController
        import com.google.gson.JsonObject // For parsing data if stored in annotation
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.Style
import com.mapbox.maps.plugin.annotation.annotations
        import com.mapbox.maps.plugin.annotation.generated.OnPointAnnotationClickListener
        import com.mapbox.maps.plugin.annotation.generated.PointAnnotation
import com.mapbox.maps.plugin.annotation.generated.PointAnnotationOptions
import com.mapbox.maps.plugin.annotation.generated.createPointAnnotationManager
import com.skyterra.android.R
import com.skyterra.android.databinding.FragmentMapBinding
import com.skyterra.android.model.Property
import com.skyterra.android.viewmodel.PropertyListViewModel // Reusing PropertyListViewModel

class MapFragment : Fragment() {

    private var _binding: FragmentMapBinding? = null
    private val binding get() = _binding!!
            private var pointAnnotationManager: com.mapbox.maps.plugin.annotation.generated.PointAnnotationManager? = null

    // Reusing PropertyListViewModel to get property locations
    // Use activityViewModels if this ViewModel is shared (e.g., with a list view)
    // Or use viewModels() if it's specific to this fragment
    private val propertyListViewModel: PropertyListViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentMapBinding.inflate(inflater, container, false)

        // Initialize Mapbox SDK.
        // Note: The Mapbox Access Token should be set in AndroidManifest.xml
        // Mapbox.getInstance(requireContext()) // This is for older SDK, v10+ auto-inits.

        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Set initial camera position (e.g., a general overview)
        // This can be overridden by loaded data later
        binding.mapView.getMapboxMap().setCamera(
            CameraOptions.Builder()
                .center(Point.fromLngLat(-70.0, -35.0)) // Example: Center of Chile
                .zoom(3.5)
                .build()
        )

        binding.mapView.getMapboxMap().loadStyleUri(Style.MAPBOX_STREETS) {
                // Initialize annotation manager here, after style is loaded
                val annotationApi = binding.mapView.annotations
                pointAnnotationManager = annotationApi.createPointAnnotationManager()

                // Add click listener to the manager
                pointAnnotationManager?.addClickListener(OnPointAnnotationClickListener { annotation: PointAnnotation ->
                    // Extract propertyId from annotation's data if stored
                    val propertyId = annotation.getData()?.asJsonObject?.get("property_id")?.asString

                    if (propertyId != null) {
                        val bundle = Bundle().apply {
                            putString("propertyId", propertyId)
                        }
                        try {
                           findNavController().navigate(R.id.action_mapFragment_to_propertyDetailFragment, bundle)
                        } catch (e: Exception) {
                             Toast.makeText(context, "Navigation error: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    } else {
                        // Generic click if no ID, or find property by other means
                        Toast.makeText(context, "Clicked marker at: ${annotation.point.latitude()}, ${annotation.point.longitude()}", Toast.LENGTH_SHORT).show()
                    }
                    true // Indicate the click was handled
                })

            observeViewModel()
        }

        // Fetch properties if not already loaded
        if (propertyListViewModel.properties.value.isNullOrEmpty() && propertyListViewModel.isLoading.value == false) {
            propertyListViewModel.fetchProperties()
        }
    }

    private fun observeViewModel() {
        propertyListViewModel.properties.observe(viewLifecycleOwner) { properties ->
            if (properties.isNotEmpty()) {
                showPropertiesOnMap(properties)
            }
        }

        propertyListViewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.mapProgressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        propertyListViewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Toast.makeText(context, "Error loading properties for map: $it", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun showPropertiesOnMap(properties: List<Property>) {
        // Ensure pointAnnotationManager is initialized (it should be if style is loaded)
        this.pointAnnotationManager?.let { manager ->
            manager.deleteAll() // Clear previous annotations

            val iconBitmap = BitmapFactory.decodeResource(resources, R.drawable.ic_map_marker_skyterra)

            properties.forEach { property ->
                if (property.latitude != null && property.longitude != null) {
                    // Store property ID in the annotation data
                    val data = JsonObject()
                    data.addProperty("property_id", property.id)

                    val pointAnnotationOptions: PointAnnotationOptions = PointAnnotationOptions()
                        .withPoint(Point.fromLngLat(property.longitude, property.latitude))
                        .withIconImage(iconBitmap)
                        .withData(data) // Add property ID here

                    manager.create(pointAnnotationOptions)
                }
            }
        }

        // Optionally, adjust camera to fit markers if it's the first load or data changes significantly
        // This can be complex; for now, manual navigation is assumed after initial load.
    }

    override fun onDestroyView() {
        super.onDestroyView()
        // Clean up annotation manager. It should remove associated listeners.
        // Nullify the reference to allow garbage collection and prevent leaks.
        pointAnnotationManager = null
        _binding = null
    }
}
