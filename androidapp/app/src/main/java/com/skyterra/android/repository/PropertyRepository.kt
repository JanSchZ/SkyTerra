package com.skyterra.android.repository

import com.skyterra.android.model.PaginatedPropertiesResponse
import com.skyterra.android.network.ApiService
import com.skyterra.android.network.RetrofitClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Response // Import Response

class PropertyRepository {
    private val apiService: ApiService = RetrofitClient.instance

    suspend fun getProperties(filters: Map<String, String> = emptyMap()): Result<PaginatedPropertiesResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getProperties(filters)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    // Simplified error handling for now
                    Result.failure(Exception("API Error: ${response.code()} ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getPropertyDetails(propertyId: String): Result<com.skyterra.android.model.Property> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getPropertyDetails(propertyId)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("API Error: ${response.code()} ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}
