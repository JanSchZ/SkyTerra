package com.skyterra.android.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.skyterra.android.model.Property
import com.skyterra.android.repository.PropertyRepository
import kotlinx.coroutines.launch

class PropertyDetailViewModel : ViewModel() {
    private val repository = PropertyRepository()

    private val _propertyDetails = MutableLiveData<Property?>()
    val propertyDetails: LiveData<Property?> = _propertyDetails

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun fetchPropertyDetails(propertyId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            val result = repository.getPropertyDetails(propertyId)
            result.fold(
                onSuccess = { property ->
                    _propertyDetails.value = property
                    _isLoading.value = false
                },
                onFailure = { e ->
                    _propertyDetails.value = null
                    _error.value = "Failed to fetch property details: ${e.message}"
                    _isLoading.value = false
                }
            )
        }
    }
}
