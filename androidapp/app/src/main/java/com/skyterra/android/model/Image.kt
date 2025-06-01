package com.skyterra.android.model

import com.google.gson.annotations.SerializedName

data class Image(
    val id: String,
    val url: String?,
    val type: String?,
    val order: Int?,
    @SerializedName("created_at")
    val createdAt: String?
)
