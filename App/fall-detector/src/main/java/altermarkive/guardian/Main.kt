package altermarkive.guardian

import altermarkive.guardian.databinding.MainBinding
import android.Manifest
import android.app.AlertDialog
import android.app.Dialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.setupActionBarWithNavController
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.bottomnavigation.BottomNavigationView

class Main : AppCompatActivity() {
    private lateinit var binding: MainBinding

    companion object {
        private const val PERMISSIONS_REQUEST_CODE = 123
        private const val TIRAMISU = 33  // Android 13
        private const val ANDROID_Q = 29  // Android 10

        // Permission request codes
        private const val LOCATION_PERMISSION_CODE = 1001
        private const val SMS_PERMISSION_CODE = 1002
        private const val CONTACTS_PERMISSION_CODE = 1003
        private const val PHONE_PERMISSION_CODE = 1004
        private const val SENSORS_PERMISSION_CODE = 1005
        private const val NOTIFICATION_PERMISSION_CODE = 1006
    }

    private fun eula(context: Context) {
        // Run the guardian
        Guardian.initiate(this)
        // Load the EULA
        val dialog = Dialog(context)
        dialog.setContentView(R.layout.eula)
        dialog.setTitle("EULA")
        val web = dialog.findViewById<View>(R.id.eula) as WebView
        web.loadUrl("file:///android_asset/eula.html")
        val accept = dialog.findViewById<View>(R.id.accept) as Button
        accept.setOnClickListener { dialog.dismiss() }
        val layout = WindowManager.LayoutParams()
        val window = dialog.window
        window ?: return
        layout.copyFrom(window.attributes)
        layout.width = WindowManager.LayoutParams.MATCH_PARENT
        layout.height = WindowManager.LayoutParams.MATCH_PARENT
        window.attributes = layout
        dialog.show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = MainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Request permissions before initializing
        checkAndRequestPermissions()

        // Setup Navigation
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        // Configure Navigation UI
        val appBarConfiguration = AppBarConfiguration(
            setOf(R.id.signals, R.id.settings)
        )
        setupActionBarWithNavController(navController, appBarConfiguration)
        binding.bottomNav.setupWithNavController(navController)  // Assuming bottomNav is the ID in main.xml

        eula(this)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        // Pass result to Tracker
        Tracker.singleton.onActivityResult(requestCode, resultCode)
    }

    private fun checkAndRequestPermissions() {
        when {
            !hasLocationPermissions() -> requestLocationPermissions()
            !hasSMSPermissions() -> requestSMSPermissions()
            !hasContactsPermissions() -> requestContactsPermissions()
            !hasPhonePermissions() -> requestPhonePermissions()
            !hasSensorPermissions() -> requestSensorPermissions()
            Build.VERSION.SDK_INT >= TIRAMISU && !hasNotificationPermissions() -> requestNotificationPermissions()
        }
    }

    private fun hasLocationPermissions() = ContextCompat.checkSelfPermission(
        this, Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED

    private fun hasSMSPermissions() = ContextCompat.checkSelfPermission(
        this, Manifest.permission.SEND_SMS
    ) == PackageManager.PERMISSION_GRANTED

    private fun hasContactsPermissions() = ContextCompat.checkSelfPermission(
        this, Manifest.permission.READ_CONTACTS
    ) == PackageManager.PERMISSION_GRANTED

    private fun hasPhonePermissions() = ContextCompat.checkSelfPermission(
        this, Manifest.permission.CALL_PHONE
    ) == PackageManager.PERMISSION_GRANTED

    private fun hasSensorPermissions() = ContextCompat.checkSelfPermission(
        this, Manifest.permission.BODY_SENSORS
    ) == PackageManager.PERMISSION_GRANTED

    private fun hasNotificationPermissions() = if (Build.VERSION.SDK_INT >= TIRAMISU) {
        ContextCompat.checkSelfPermission(
            this, "android.permission.POST_NOTIFICATIONS"
        ) == PackageManager.PERMISSION_GRANTED
    } else true

    private fun requestLocationPermissions() {
        showPermissionRationaleDialog(
            "Location Permission Required",
            "This app needs location access to send your location in case of emergency.",
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ),
            LOCATION_PERMISSION_CODE
        )
    }

    private fun requestSMSPermissions() {
        showPermissionRationaleDialog(
            "SMS Permission Required",
            "SMS permission is needed to send emergency messages to your contacts.",
            arrayOf(Manifest.permission.SEND_SMS),
            SMS_PERMISSION_CODE
        )
    }

    private fun requestContactsPermissions() {
        showPermissionRationaleDialog(
            "Contacts Permission Required",
            "Contacts access is needed to select emergency contacts.",
            arrayOf(Manifest.permission.READ_CONTACTS),
            CONTACTS_PERMISSION_CODE
        )
    }

    private fun requestPhonePermissions() {
        showPermissionRationaleDialog(
            "Phone Permission Required",
            "Phone permission is needed to make emergency calls.",
            arrayOf(Manifest.permission.CALL_PHONE),
            PHONE_PERMISSION_CODE
        )
    }

    private fun requestSensorPermissions() {
        showPermissionRationaleDialog(
            "Sensor Permission Required",
            "Sensor access is needed to detect falls.",
            arrayOf(Manifest.permission.BODY_SENSORS),
            SENSORS_PERMISSION_CODE
        )
    }

    private fun requestNotificationPermissions() {
        if (Build.VERSION.SDK_INT >= TIRAMISU) {
            showPermissionRationaleDialog(
                "Notification Permission Required",
                "Notifications are needed to alert you about fall detection.",
                arrayOf("android.permission.POST_NOTIFICATIONS"),
                NOTIFICATION_PERMISSION_CODE
            )
        }
    }

    private fun showPermissionRationaleDialog(
        title: String,
        message: String,
        permissions: Array<String>,
        requestCode: Int
    ) {
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("Grant") { _, _ ->
                ActivityCompat.requestPermissions(this, permissions, requestCode)
            }
            .setNegativeButton("Not Now") { dialog, _ ->
                dialog.dismiss()
                // Show warning about limited functionality
                Toast.makeText(
                    this,
                    "Some features won't work without this permission",
                    Toast.LENGTH_LONG
                ).show()
                // Continue checking next permission
                checkAndRequestPermissions()
            }
            .setCancelable(false)
            .show()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val granted = grantResults.isNotEmpty() && 
                      grantResults[0] == PackageManager.PERMISSION_GRANTED
        
        when (requestCode) {
            LOCATION_PERMISSION_CODE -> {
                if (!granted) showPermissionDeniedMessage("Location")
                checkAndRequestPermissions()
            }
            SMS_PERMISSION_CODE -> {
                if (!granted) showPermissionDeniedMessage("SMS")
                checkAndRequestPermissions()
            }
            CONTACTS_PERMISSION_CODE -> {
                if (!granted) showPermissionDeniedMessage("Contacts")
                checkAndRequestPermissions()
            }
            PHONE_PERMISSION_CODE -> {
                if (!granted) showPermissionDeniedMessage("Phone")
                checkAndRequestPermissions()
            }
            SENSORS_PERMISSION_CODE -> {
                if (!granted) showPermissionDeniedMessage("Sensors")
                checkAndRequestPermissions()
            }
            NOTIFICATION_PERMISSION_CODE -> {
                if (!granted) showPermissionDeniedMessage("Notifications")
                checkAndRequestPermissions()
            }
        }
    }

    private fun showPermissionDeniedMessage(permissionName: String) {
        Toast.makeText(
            this,
            "$permissionName features will be limited",
            Toast.LENGTH_SHORT
        ).show()
    }
}