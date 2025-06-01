package com.skyterra.android.ui.propertylist

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
        import android.os.Bundle // For Bundle if not using Safe Args
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
        import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
        import com.skyterra.android.R // Import R for resource IDs
import com.skyterra.android.databinding.FragmentPropertyListBinding // Assuming fragment_property_list.xml
import com.skyterra.android.viewmodel.PropertyListViewModel

class PropertyListFragment : Fragment() {

    private var _binding: FragmentPropertyListBinding? = null
    private val binding get() = _binding!!

    private val viewModel: PropertyListViewModel by viewModels()
    private lateinit var propertyAdapter: PropertyAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPropertyListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        observeViewModel()

        // Example: Trigger a fetch if not already loading
        if (viewModel.properties.value.isNullOrEmpty() && viewModel.isLoading.value == false) {
            viewModel.fetchProperties()
        }
    }

    private fun setupRecyclerView() {
        propertyAdapter = PropertyAdapter { property ->
                    val bundle = Bundle().apply {
                        putString("propertyId", property.id)
                    }
                    // Assuming nav_graph.xml has an action from propertyListFragment to propertyDetailFragment
                    // If the action ID is action_propertyListFragment_to_propertyDetailFragment
                    try {
                        findNavController().navigate(R.id.action_propertyListFragment_to_propertyDetailFragment, bundle)
                    } catch (e: Exception) {
                        // Fallback or error logging if navigation fails (e.g. ID not found)
                        Toast.makeText(context, "Navigation error: ${e.message}", Toast.LENGTH_LONG).show()
                    }
        }
        binding.recyclerViewProperties.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = propertyAdapter
        }
    }

    private fun observeViewModel() {
        viewModel.properties.observe(viewLifecycleOwner) { properties ->
            propertyAdapter.submitList(properties)
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            //binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null // Avoid memory leaks
    }
}
