package com.skyterra.android.ui.propertylist

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.skyterra.android.R
import com.skyterra.android.model.Property
import com.skyterra.android.databinding.ItemPropertyBinding // Assuming item_property.xml

class PropertyAdapter(private val onClickListener: (Property) -> Unit) :
    ListAdapter<Property, PropertyAdapter.PropertyViewHolder>(PropertyDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PropertyViewHolder {
        val binding = ItemPropertyBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return PropertyViewHolder(binding)
    }

    override fun onBindViewHolder(holder: PropertyViewHolder, position: Int) {
        val property = getItem(position)
        holder.bind(property)
        holder.itemView.setOnClickListener { onClickListener(property) }
    }

    inner class PropertyViewHolder(private val binding: ItemPropertyBinding) :
        RecyclerView.ViewHolder(binding.root) {
        fun bind(property: Property) {
            binding.propertyName.text = property.name ?: "N/A"
            binding.propertyPrice.text = property.price?.let { "USD ${'$'}%.2f".format(it) } ?: "N/A"
            binding.propertySize.text = property.size?.let { "%.2f ha".format(it) } ?: "N/A"
            
            // Placeholder for image - replace with actual image URL logic
            // val imageUrl = property.images?.firstOrNull()?.url 
            // For now, using a placeholder if imageCount > 0
            if ((property.imageCount ?: 0) > 0) {
                Glide.with(binding.propertyImage.context)
                    .load(R.drawable.ic_launcher_background) // Replace with actual image or placeholder logic
                    .placeholder(R.drawable.ic_launcher_background) // Placeholder
                    .error(R.drawable.ic_launcher_foreground) // Error placeholder
                    .into(binding.propertyImage)
            } else {
                 binding.propertyImage.setImageResource(R.drawable.ic_launcher_foreground) // Default if no image
            }
        }
    }
}

class PropertyDiffCallback : DiffUtil.ItemCallback<Property>() {
    override fun areItemsTheSame(oldItem: Property, newItem: Property): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: Property, newItem: Property): Boolean {
        return oldItem == newItem
    }
}
