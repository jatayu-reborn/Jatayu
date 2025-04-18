package altermarkive.guardian

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import androidx.core.app.ActivityCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class LocationHelper(private val context: Context) {
    private val locationManager: LocationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    private var currentLocation: Location? = null

    fun getCurrentLocation(): Location? {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            try {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0L, 0f, locationListener)
                return locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            } catch (e: Exception) {
                Trace.e(TAG, "Error getting location: ${e.message}")
            }
        }
        return null
    }

    private val locationListener: LocationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            currentLocation = location
        }

        @Deprecated("Deprecated in Java")
        override fun onStatusChanged(provider: String, status: Int, extras: Bundle) {}

        override fun onProviderEnabled(provider: String) {}

        override fun onProviderDisabled(provider: String) {}
    }

    fun getLocationString(): String {
        val location = getCurrentLocation()
        sendLocationToServer( "https://garuda-phi.vercel.app/api/coordinates",location)
        return if (location != null) {
            "Location: https://maps.google.com/?q=${location.latitude},${location.longitude}"
        } else {
            "Location unavailable"
        }
    }

    fun sendLocationToServer(apiUrl: String, location: Location?) {
        if (location != null) {
            val coordinate = JSONObject().apply {
                put("latitude", location.latitude)
                put("longitude", location.longitude)
                put("priority", "unknown")
            }
            val jsonPayload = JSONObject().apply {
                put("coordinates", JSONArray().apply {
                    put(coordinate)
                })
            }
            
            Thread {
                try {
                    val url = URL(apiUrl)
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.setRequestProperty("Accept", "application/json")

                    val writer = OutputStreamWriter(connection.outputStream)
                    writer.write(jsonPayload.toString())
                    writer.flush()
                    writer.close()

                    val responseCode = connection.responseCode
                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        Trace.i(TAG, "Location sent successfully.")
                    } else {
                        Trace.e(TAG, "Failed to send location. Response code: $responseCode")
                    }
                } catch (e: Exception) {
                    Trace.e(TAG, "Error sending location: ${e.message}")
                }
            }.start()
        } else {
            Trace.e(TAG, "Cannot send location. Location is unavailable.")
        }
    }

    companion object {
        private val TAG: String = LocationHelper::class.java.simpleName
    }
}
