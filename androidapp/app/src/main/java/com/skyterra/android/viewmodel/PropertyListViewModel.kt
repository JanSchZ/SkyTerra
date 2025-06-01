package com.skyterra.android.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.skyterra.android.model.PaginatedPropertiesResponse
import com.skyterra.android.model.Property
import com.skyterra.android.repository.PropertyRepository
import kotlinx.coroutines.launch

class PropertyListViewModel : ViewModel() {
    private val repository = PropertyRepository()

    private val _properties = MutableLiveData<List<Property>>()
    val properties: LiveData<List<Property>> = _properties

    // For pagination details
    private val _currentPage = MutableLiveData<Int>()
    val currentPage: LiveData<Int> = _currentPage
    private val _totalPages = MutableLiveData<Int>() // Assuming page size for calculation
    val totalPages: LiveData<Int> = _totalPages
    private val _totalResults = MutableLiveData<Int>()
    val totalResults: LiveData<Int> = _totalResults


    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    init {
        fetchProperties() // Initial fetch
    }

    fun fetchProperties(page: Int = 1, filters: Map<String, String> = emptyMap()) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            val currentFilters = filters.toMutableMap()
            currentFilters["page"] = page.toString()
            // currentFilters["page_size"] = "10" // Example page size

            val result = repository.getProperties(currentFilters)
            result.fold(
                onSuccess = { paginatedResponse ->
                    _properties.value = paginatedResponse.results
                    _totalResults.value = paginatedResponse.count
                    _currentPage.value = page
                    // Calculate total pages (example, assuming backend provides page_size or we fix it)
                    // val pageSize = 10 // Example
                    // _totalPages.value = (paginatedResponse.count + pageSize - 1) / pageSize
                    _isLoading.value = false
                },
                onFailure = { e ->
                    _properties.value = emptyList() // Clear previous data on error
                    _error.value = "Failed to fetch properties: ${e.message}"
                    _isLoading.value = false
                }
            )
        }
    }
}
