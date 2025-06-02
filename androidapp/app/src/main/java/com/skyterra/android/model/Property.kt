package com.skyterra.android.model

import com.google.gson.annotations.SerializedName

// Assuming Owner class is already defined as in previous step

data class Property(
    val id: String,
    val name: String?,
    val type: String?,
    val price: Double?,
    val size: Double?,
    val latitude: Double?,
    val longitude: Double?,
    @SerializedName("boundary_polygon")
    val boundaryPolygon: Any?, 
    val description: String?, // Added for details
    @SerializedName("has_water")
    val hasWater: Boolean?,
    @SerializedName("has_views")
    val hasViews: Boolean?,
    @SerializedName("publication_status")
    val publicationStatus: String?,
    @SerializedName("owner_details")
    val ownerDetails: Owner?,
    @SerializedName("created_at")
    val createdAt: String?,
    @SerializedName("updated_at")
    val updatedAt: String?, // Added for details

    // Fields from PropertyListSerializer (might be redundant if PropertySerializer has them too)
    @SerializedName("image_count") 
    val imageCount: Int?,
    @SerializedName("has_tour") 
    val hasTour: Boolean?,

    // Detailed fields from PropertySerializer
    val images: List<Image>?,
    val tours: List<Tour>?
)

data class Owner( // Ensure Owner class is defined here or imported if in a separate file
    val id: Int,
    val username: String?,
    val email: String?
)

// Wrapper class for paginated API response, as seen in web app's propertyService
// This should remain if it's used by the listing part
data class PaginatedPropertiesResponse(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<Property>
)
