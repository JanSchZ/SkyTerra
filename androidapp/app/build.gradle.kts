plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt") // For libraries like Room, if using kapt instead of ksp for some
    // id("com.google.devtools.ksp") // Uncomment if using ksp for Room/Moshi code gen
}

android {
    namespace = "com.skyterra.android"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.skyterra.android"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        viewBinding = true // Enable ViewBinding
        // dataBinding = true // Enable DataBinding if needed
    }
}

dependencies {
    // Core AndroidX
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0") // ViewModel
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.7.0") // LiveData
    implementation("androidx.navigation:navigation-fragment-ktx:2.7.7") // Navigation Component
    implementation("androidx.navigation:navigation-ui-ktx:2.7.7")     // Navigation Component

    // Networking - Retrofit & Gson
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0") // Optional: for logging requests

    // Image Loading - Glide
    implementation("com.github.bumptech.glide:glide:4.16.0")
    kapt("com.github.bumptech.glide:compiler:4.12.0") // Use kapt or ksp for Glide's annotation processor

    // Mapbox SDK - Make sure this is the latest or recommended version
    // Note: Mapbox setup also requires configuration in AndroidManifest.xml for access token
    implementation("com.mapbox.maps:android:11.0.0") // Check for latest stable version

    // Room (for local database, if needed later)
    // implementation("androidx.room:room-runtime:2.6.1")
    // annotationProcessor("androidx.room:room-compiler:2.6.1") // For Java projects
    // kapt("androidx.room:room-compiler:2.6.1") // For Kotlin projects with kapt
    // implementation("androidx.room:room-ktx:2.6.1") // Kotlin Extensions and Coroutines support for Room

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
