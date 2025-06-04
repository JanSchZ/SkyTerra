package com.skyterra.android.ui.propertydetail

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.navArgs // If using Navigation Component Safe Args
import com.bumptech.glide.Glide
import com.skyterra.android.R
import com.skyterra.android.databinding.FragmentPropertyDetailBinding
import com.skyterra.android.model.Property
import com.skyterra.android.viewmodel.PropertyDetailViewModel
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class PropertyDetailFragment : Fragment() {

    private var _binding: FragmentPropertyDetailBinding? = null
    private val binding get() = _binding!!

    private val viewModel: PropertyDetailViewModel by viewModels()
    // Assuming you'll pass propertyId via Navigation Component arguments
    // private val args: PropertyDetailFragmentArgs by navArgs()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPropertyDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // val propertyId = args.propertyId // Get propertyId from nav args
        // For now, using a placeholder ID. Replace with actual ID from navigation.
        val propertyId = arguments?.getString("propertyId") ?: "1" // Example, replace later

        observeViewModel()
        viewModel.fetchPropertyDetails(propertyId)
    }

    private fun observeViewModel() {
        viewModel.propertyDetails.observe(viewLifecycleOwner) { property ->
            property?.let { bindPropertyDetails(it) }
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.propertyDetailProgressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Toast.makeText(context, it, Toast.LENGTH_LONG).show()
                // Optionally, show an error message in the UI
            }
        }
    }

    private fun bindPropertyDetails(property: Property) {
        binding.propertyDetailName.text = property.name ?: "N/A"
        binding.propertyDetailPrice.text = property.price?.let { "USD ${'$'}%,.2f".format(it) } ?: "N/A"
        binding.propertyDetailSize.text = property.size?.let { "%.2f ha".format(it) } ?: "N/A"
        binding.propertyDetailTypeChip.text = property.type?.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() } ?: "N/A"
        binding.propertyDetailDescription.text = property.description.takeIf { !it.isNullOrBlank() } ?: "No description available."

        binding.checkboxHasWater.isChecked = property.hasWater ?: false
        binding.checkboxHasViews.isChecked = property.hasViews ?: false

        property.ownerDetails?.let { owner ->
            binding.propertyDetailOwnerName.text = "Owner: ${owner.username ?: "N/A"} (${owner.email ?: "N/A"})"
        } ?: run {
            binding.propertyDetailOwnerName.text = "Owner details not available."
        }

        binding.propertyDetailCreatedAt.text = "Listed: ${formatIsoDate(property.createdAt)}"

        // Load image using Glide (first image for now)
        val imageUrl = property.images?.firstOrNull()?.url
        if (!imageUrl.isNullOrEmpty()) {
            Glide.with(this)
                .load(imageUrl)
                .placeholder(R.drawable.ic_launcher_background) // Generic placeholder
                .error(R.drawable.ic_launcher_foreground) // Error placeholder
                .into(binding.propertyDetailImage)
        } else {
            binding.propertyDetailImage.setImageResource(R.drawable.ic_launcher_background) // Default if no image
        }
    }

    private fun formatIsoDate(isoDateString: String?): String {
        if (isoDateString.isNullOrEmpty()) return "N/A"
        return try {
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'", Locale.getDefault())
            inputFormat.timeZone = TimeZone.getTimeZone("UTC")
            val date = inputFormat.parse(isoDateString)

            val outputFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
            outputFormat.timeZone = TimeZone.getDefault() // Convert to local timezone for display
            date?.let { outputFormat.format(it) } ?: "N/A"
        } catch (e: Exception) {
            // Fallback for slightly different ISO formats or if parsing fails
            try {
                val simplerInputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault())
                simplerInputFormat.timeZone = TimeZone.getTimeZone("UTC")
                val date = simplerInputFormat.parse(isoDateString)
                val outputFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                outputFormat.timeZone = TimeZone.getDefault()
                date?.let { outputFormat.format(it) } ?: "N/A"
            } catch (e2: Exception) {
                isoDateString // Return original if all parsing fails
            }
        }
    }


    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null // Avoid memory leaks
    }
}
