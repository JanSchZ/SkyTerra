package com.skyterra.android.network

import com.skyterra.android.model.PaginatedPropertiesResponse
import com.skyterra.android.model.Property // Import Property for details
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path // Import Path
import retrofit2.http.QueryMap

interface ApiService {
    @GET("properties/") // Endpoint from backend urls.py
    suspend fun getProperties(@QueryMap filters: Map<String, String>): Response<PaginatedPropertiesResponse>

    @GET("properties/{id}/") // Endpoint for property detail
    suspend fun getPropertyDetails(@Path("id") propertyId: String): Response<Property>
}
