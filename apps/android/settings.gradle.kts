import org.gradle.api.credentials.PasswordCredentials
import org.gradle.authentication.http.BasicAuthentication

rootProject.name = "SkyTerraAndroid"

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven(url = "https://api.mapbox.com/downloads/v2/releases/maven") {
            name = "Mapbox"
            credentials(PasswordCredentials::class)
            authentication {
                create<BasicAuthentication>("basic")
            }
            val token = providers.gradleProperty("MAPBOX_DOWNLOADS_TOKEN")
                .orElse(System.getenv("MAPBOX_DOWNLOADS_TOKEN") ?: "")
                .get()
            credentials.username = "mapbox"
            credentials.password = token
        }
    }
}

include(":app")
