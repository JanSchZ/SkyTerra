package com.skyterra.android.model

import com.google.gson.annotations.SerializedName

data class Tour(
    val id: String,
    val url: String?,
    val type: String?,
    @SerializedName("created_at")
    val createdAt: String?
)
