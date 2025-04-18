package altermarkive.guardian

import android.content.Context
import android.content.Context.SENSOR_SERVICE
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import android.os.Handler
import android.os.Looper
import kotlin.math.sqrt
import android.Manifest
import android.content.pm.PackageManager
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.app.Activity
import android.app.AlertDialog
import android.view.LayoutInflater
import android.media.MediaPlayer
import android.os.CountDownTimer
import android.widget.Button
import android.content.ContextWrapper
import android.widget.TextView
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.os.Build
import androidx.core.app.NotificationCompat

class Tracker private constructor() : SensorEventListener {
    var context: Guardian? = null

    companion object {
        internal var singleton: Tracker = Tracker()

        internal fun instance(context: Guardian): Tracker {
            if (singleton.context != context) {
                singleton.initiateSensor(context)
            }
            return singleton
        }

        private val TAG: String = Tracker::class.java.simpleName

        fun log(level: Int, entry: String) {
            Log.println(level, TAG, entry)
        }

        internal const val INTERVAL_MS = 20
        private const val DURATION_S = 10
        internal const val N = DURATION_S * 1000 / INTERVAL_MS
        internal const val FALLING_WAIST_SV_TOT = 0.6
        internal const val IMPACT_WAIST_SV_TOT = 2.0
        internal const val IMPACT_WAIST_SV_D = 1.7
        internal const val IMPACT_WAIST_SV_MAX_MIN = 2.0
        internal const val IMPACT_WAIST_Z_2 = 1.5

        private const val SPAN_MAX_MIN = 100 / INTERVAL_MS
        private const val SPAN_FALLING = 1000 / INTERVAL_MS
        private const val SPAN_IMPACT = 2000 / INTERVAL_MS
        private const val SPAN_AVERAGING = 400 / INTERVAL_MS

        private const val FILTER_N_ZEROS = 2
        private const val FILTER_N_POLES = 2
        private const val FILTER_LPF_GAIN = 4.143204922e+03
        private const val FILTER_HPF_GAIN = 1.022463023e+00
        private const val FILTER_FACTOR_0 = -0.9565436765
        private const val FILTER_FACTOR_1 = +1.9555782403

        private const val G = 1.0

        private const val LYING_AVERAGE_Z_LPF = 0.5

        internal const val BUFFER_X: Int = 0
        internal const val BUFFER_Y: Int = 1
        internal const val BUFFER_Z: Int = 2
        internal const val BUFFER_X_LPF: Int = 3
        internal const val BUFFER_Y_LPF: Int = 4
        internal const val BUFFER_Z_LPF: Int = 5
        internal const val BUFFER_X_HPF: Int = 6
        internal const val BUFFER_Y_HPF: Int = 7
        internal const val BUFFER_Z_HPF: Int = 8
        internal const val BUFFER_X_MAX_MIN: Int = 9
        internal const val BUFFER_Y_MAX_MIN: Int = 10
        internal const val BUFFER_Z_MAX_MIN: Int = 11
        internal const val BUFFER_SV_TOT: Int = 12
        internal const val BUFFER_SV_D: Int = 13
        internal const val BUFFER_SV_MAX_MIN: Int = 14
        internal const val BUFFER_Z_2: Int = 15
        internal const val BUFFER_FALLING: Int = 16
        internal const val BUFFER_IMPACT: Int = 17
        internal const val BUFFER_LYING: Int = 18
        internal const val BUFFER_COUNT: Int = 19

        private const val FALL_NOTIFICATION_ID = 9999
    }

    private var timeoutFalling: Int = -1
    private var timeoutImpact: Int = -1
    val cache: Cache = Cache(BUFFER_COUNT, N, 0, Double.NaN)
    private val x: DoubleArray = cache.buffers[BUFFER_X]
    private val y: DoubleArray = cache.buffers[BUFFER_Y]
    private val z: DoubleArray = cache.buffers[BUFFER_Z]
    private val xLPF: DoubleArray = cache.buffers[BUFFER_X_LPF]
    private val yLPF: DoubleArray = cache.buffers[BUFFER_Y_LPF]
    private val zLPF: DoubleArray = cache.buffers[BUFFER_Z_LPF]
    private val xHPF: DoubleArray = cache.buffers[BUFFER_X_HPF]
    private val yHPF: DoubleArray = cache.buffers[BUFFER_Y_HPF]
    private val zHPF: DoubleArray = cache.buffers[BUFFER_Z_HPF]
    private val xMaxMin: DoubleArray = cache.buffers[BUFFER_X_MAX_MIN]
    private val yMaxMin: DoubleArray = cache.buffers[BUFFER_Y_MAX_MIN]
    private val zMaxMin: DoubleArray = cache.buffers[BUFFER_Z_MAX_MIN]
    private val svTOT: DoubleArray = cache.buffers[BUFFER_SV_TOT]
    private val svD: DoubleArray = cache.buffers[BUFFER_SV_D]
    private val svMaxMin: DoubleArray = cache.buffers[BUFFER_SV_MAX_MIN]
    private val z2: DoubleArray = cache.buffers[BUFFER_Z_2]
    private val falling: DoubleArray = cache.buffers[BUFFER_FALLING]
    private val impact: DoubleArray = cache.buffers[BUFFER_IMPACT]
    private val lying: DoubleArray = cache.buffers[BUFFER_LYING]
    private val xLpfXV = DoubleArray(FILTER_N_ZEROS + 1) { 0.0 }
    private val xLpfYV = DoubleArray(FILTER_N_POLES + 1) { 0.0 }
    private val yLpfXV = DoubleArray(FILTER_N_ZEROS + 1) { 0.0 }
    private val yLpfYV = DoubleArray(FILTER_N_POLES + 1) { 0.0 }
    private val zLpfXV = DoubleArray(FILTER_N_ZEROS + 1) { 0.0 }
    private val zLpfYV = DoubleArray(FILTER_N_POLES + 1) { 0.0 }
    private val xHpfXV = DoubleArray(FILTER_N_ZEROS + 1) { 0.0 }
    private val xHpfYV = DoubleArray(FILTER_N_POLES + 1) { 0.0 }
    private val yHpfXV = DoubleArray(FILTER_N_ZEROS + 1) { 0.0 }
    private val yHpfYV = DoubleArray(FILTER_N_POLES + 1) { 0.0 }
    private val zHpfXV = DoubleArray(FILTER_N_ZEROS + 1) { 0.0 }
    private val zHpfYV = DoubleArray(FILTER_N_POLES + 1) { 0.0 }
    private var anteX: Double = Double.NaN
    private var anteY: Double = Double.NaN
    private var anteZ: Double = Double.NaN
    private var anteTime: Long = 0
    private var regular: Long = 0

    private var fallNotificationTimer: Handler? = null
    private var fallDetectionTime: Long = 0

    private fun linear(before: Long, ante: Double, after: Long, post: Double, now: Long): Double {
        return ante + (post - ante) * (now - before).toDouble() / (after - before).toDouble()
    }

    @Suppress("SameParameterValue")
    private fun at(array: DoubleArray, index: Int, size: Int): Double {
        return array[(index + size) % size]
    }

    private fun expire(timeout: Int): Int {
        return if (timeout > -1) {
            timeout - 1
        } else {
            -1
        }
    }

    private fun sv(x: Double, y: Double, z: Double): Double {
        return sqrt(x * x + y * y + z * z)
    }

    private fun min(array: DoubleArray): Double {
        var min: Double = at(array, cache.position, N)
        for (i: Int in 1 until SPAN_MAX_MIN) {
            val value: Double = at(array, cache.position - i, N)
            if (!value.isNaN() && value < min) {
                min = value
            }
        }
        return min
    }

    private fun max(array: DoubleArray): Double {
        var max: Double = at(array, cache.position, N)
        for (i: Int in 1 until SPAN_MAX_MIN) {
            val value: Double = at(array, cache.position - i, N)
            if (!value.isNaN() && max < value) {
                max = value
            }
        }
        return max
    }

    // Low-pass Butterworth filter, 2nd order, 50 Hz sampling rate, corner frequency 0.25 Hz
    private fun lpf(value: Double, xv: DoubleArray, yv: DoubleArray): Double {
        xv[0] = xv[1]
        xv[1] = xv[2]
        xv[2] = value / FILTER_LPF_GAIN
        yv[0] = yv[1]
        yv[1] = yv[2]
        yv[2] = (xv[0] + xv[2]) + 2 * xv[1] + (FILTER_FACTOR_0 * yv[0]) + (FILTER_FACTOR_1 * yv[1])
        return yv[2]
    }

    // High-pass Butterworth filter, 2nd order, 50 Hz sampling rate, corner frequency 0.25 Hz
    private fun hpf(value: Double, xv: DoubleArray, yv: DoubleArray): Double {
        xv[0] = xv[1]
        xv[1] = xv[2]
        xv[2] = value / FILTER_HPF_GAIN
        yv[0] = yv[1]
        yv[1] = yv[2]
        yv[2] = (xv[0] + xv[2]) - 2 * xv[1] + (FILTER_FACTOR_0 * yv[0]) + (FILTER_FACTOR_1 * yv[1])
        return yv[2]
    }

    private fun process() {
        val at: Int = cache.position
        timeoutFalling = expire(timeoutFalling)
        timeoutImpact = expire(timeoutImpact)
        xLPF[at] = lpf(x[at], xLpfXV, xLpfYV)
        yLPF[at] = lpf(y[at], yLpfXV, yLpfYV)
        zLPF[at] = lpf(z[at], zLpfXV, zLpfYV)
        xHPF[at] = hpf(x[at], xHpfXV, xHpfYV)
        yHPF[at] = hpf(y[at], yHpfXV, yHpfYV)
        zHPF[at] = hpf(z[at], zHpfXV, zHpfYV)
        xMaxMin[at] = max(x) - min(x)
        yMaxMin[at] = max(y) - min(y)
        zMaxMin[at] = max(z) - min(z)
        val svTOTAt: Double = sv(x[at], y[at], z[at])
        svTOT[at] = svTOTAt
        val svDAt: Double = sv(xHPF[at], yHPF[at], zHPF[at])
        svD[at] = svDAt
        svMaxMin[at] = sv(xMaxMin[at], yMaxMin[at], zMaxMin[at])
        z2[at] = (svTOTAt * svTOTAt - svDAt * svDAt - G * G) / (2.0 * G)
        val svTOTBefore: Double = at(svTOT, at - 1, N)
        falling[at] = 0.0
        if (FALLING_WAIST_SV_TOT <= svTOTBefore && svTOTAt < FALLING_WAIST_SV_TOT) {
            timeoutFalling = SPAN_FALLING
            falling[at] = 1.0
        }
        impact[at] = 0.0
        if (-1 < timeoutFalling) {
            val svMaxMinAt: Double = svMaxMin[at]
            val z2At: Double = z2[at]
            if (IMPACT_WAIST_SV_TOT <= svTOTAt || IMPACT_WAIST_SV_D <= svDAt ||
                IMPACT_WAIST_SV_MAX_MIN <= svMaxMinAt || IMPACT_WAIST_Z_2 <= z2At
            ) {
                timeoutImpact = SPAN_IMPACT
                impact[at] = 1.0
            }
        }
        lying[at] = 0.0
        if (0 == timeoutImpact) {
            var sum = 0.0
            var count = 0.0
            for (i: Int in 0 until SPAN_AVERAGING) {
                val value: Double = at(zLPF, at - i, N)
                if (!value.isNaN()) {
                    sum += value
                    count += 1.0
                }
            }
            if (LYING_AVERAGE_Z_LPF < (sum / count)) {
                lying[at] = 1.0
                val context = this.context
                if (context != null) {
                    Guardian.say(context, android.util.Log.WARN, TAG, "Detected a fall")
                    // Only show prompt, don't call alert directly - we'll wait for user response
                    showFallDetectedPrompt(context)
                }
            }
        }
    }

    private fun showFallDetectedPrompt(context: Context) {
        try {
            // Set the detection time
            fallDetectionTime = System.currentTimeMillis()
            
            // Determine if app is in foreground or background
            val isAppInBackground = !isAppInForeground(context)
            Log.i(TAG, "Fall detected, app in background: $isAppInBackground")
            
            if (isAppInBackground) {
                // Show notification and start a 7-second timer
                showHighPriorityNotification(context)
                
                // Start a timer that will send the alert after 7 seconds if not canceled
                fallNotificationTimer = Handler(Looper.getMainLooper())
                fallNotificationTimer?.postDelayed({
                    Log.i(TAG, "Notification timer expired, sending alert")
                    // Cancel the notification
                    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.cancel(FALL_NOTIFICATION_ID)
                    // Send the alert
                    sendAlert(context)
                }, 7000) // 7 seconds
            } else {
                // App is in foreground, directly show activity
                val intent = Intent(context, FallDetectedActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                context.startActivity(intent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error showing fall detection screen: ${e.message}")
            sendAlert(context)
        }
    }

    private fun showHighPriorityNotification(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        // Create channel for Android O+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "fall_detection_channel",
                "Fall Detection Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                enableLights(true)
                enableVibration(true)
                setBypassDnd(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
        }
        
        // Create intent for notification that includes the detection time
        val fullScreenIntent = Intent(context, FallDetectedActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("FALL_DETECTION_TIME", fallDetectionTime)
        }
        
        // Create pending intent with proper flags
        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context, 0, fullScreenIntent, pendingIntentFlags
        )
        
        // Build high-priority notification
        val notification = NotificationCompat.Builder(context, "fall_detection_channel")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Fall Detected! Urgent!")
            .setContentText("Tap to confirm you're okay")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setAutoCancel(true)
            .build()
        
        // Show the notification
        notificationManager.notify(FALL_NOTIFICATION_ID, notification)
        Log.i(TAG, "Displayed high-priority notification")
    }

    private fun isAppInForeground(context: Context): Boolean {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val appProcesses = activityManager.runningAppProcesses ?: return false
        val packageName = context.packageName
        
        for (appProcess in appProcesses) {
            if (appProcess.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND 
                && appProcess.processName == packageName) {
                return true
            }
        }
        return false
    }

    // Add method to handle activity result
    fun onActivityResult(requestCode: Int, resultCode: Int) {
        when (requestCode) {
            FallDetectedActivity.REQUEST_CODE -> {
                if (resultCode == Activity.RESULT_OK) {
                    // User didn't respond in time or needs help
                    context?.let { sendAlert(it) }
                }
                // If RESULT_CANCELED, do nothing as user indicated they're fine
            }
        }
    }

    // Add method to cancel the notification timer if user responds
    fun cancelNotificationTimer() {
        fallNotificationTimer?.removeCallbacksAndMessages(null)
        fallNotificationTimer = null
    }

    // Remove old dialog-related code and variables since we're using Activity now

    private fun getActivity(context: Context): Activity? {
        var ctx = context
        while (ctx is ContextWrapper) {
            if (ctx is Activity) {
                return ctx
            }
            ctx = ctx.baseContext
        }
        return null
    }

    private fun sendAlert(context: Context) {
        try {
            if (checkPermissions(context)) {
                Ring.alert(context)
                locating.singleton?.trigger()
                Toast.makeText(context,
                    "Sending emergency alert...",
                    Toast.LENGTH_LONG).show()
            } else {
                requestPermissions(context)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending alert: ${e.message}")
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context,
                    "Error sending alert: ${e.message}",
                    Toast.LENGTH_LONG).show()
            }
        }
    }

    // Android sampling is irregular, thus the signal is (linearly) resampled at 50 Hz
    private fun resample(postTime: Long, postX: Double, postY: Double, postZ: Double) {
        if (0L == anteTime) {
            regular = postTime + INTERVAL_MS
            return
        }
        while (regular < postTime) {
            val at: Int = cache.position
            x[at] = linear(anteTime, anteX, postTime, postX, regular)
            y[at] = linear(anteTime, anteY, postTime, postY, regular)
            z[at] = linear(anteTime, anteZ, postTime, postZ, regular)
            process()
            cache.position = (cache.position + 1) % N
            regular += INTERVAL_MS
        }
    }

    private fun protect(postTime: Long, postX: Double, postY: Double, postZ: Double) {
        synchronized(cache) {
            resample(postTime, postX, postY, postZ)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {
        if (Sensor.TYPE_ACCELEROMETER == sensor.type) {
            log(android.util.Log.INFO, "Accuracy of the accelerometer is now equal to $accuracy")
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (Sensor.TYPE_ACCELEROMETER == event.sensor.type) {
            val postTime: Long = event.timestamp / 1000000
            val postX = event.values[0].toDouble() / SensorManager.STANDARD_GRAVITY
            val postY = event.values[1].toDouble() / SensorManager.STANDARD_GRAVITY
            val postZ = event.values[2].toDouble() / SensorManager.STANDARD_GRAVITY
            protect(postTime, postX, postY, postZ)
            anteTime = postTime
            anteX = postX
            anteY = postY
            anteZ = postZ
        }
    }

    private fun initiateSensor(context: Guardian) {
        this.context = context
        val manager: SensorManager = context.getSystemService(SENSOR_SERVICE) as SensorManager
        val sensor: Sensor = manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        val vendor: String = sensor.vendor
        val name: String = sensor.name
        val delay: Int = sensor.minDelay
        val resolution: Float = sensor.resolution
        log(android.util.Log.INFO, "Sensor: $vendor, $name, $delay [us], $resolution")
        manager.registerListener(this, sensor, INTERVAL_MS * 1000)
    }

    internal fun alert(context: Context) {
        try {
            // Check permissions first
            if (checkPermissions(context)) {
                Ring.alert(context)
                // Get location and send SMS
                locating.singleton?.trigger()
            } else {
                // Only request permissions if context is an Activity
                if (context is Activity) {
                    ActivityCompat.requestPermissions(context,
                        arrayOf(
                            Manifest.permission.SEND_SMS,
                            Manifest.permission.ACCESS_FINE_LOCATION
                        ),
                        1001)
                } else {
                    // Show toast if we can't request permissions
                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(context,
                            "Required permissions not granted",
                            Toast.LENGTH_LONG).show()
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in alert: ${e.message}")
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context,
                    "Error sending alert: ${e.message}",
                    Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun checkPermissions(context: Context): Boolean {
        return (ContextCompat.checkSelfPermission(context, 
            Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context,
            Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED)
    }

    private fun requestPermissions(context: Context) {
        if (context is Activity) {
            ActivityCompat.requestPermissions(context,
                arrayOf(
                    Manifest.permission.SEND_SMS,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ),
                1001)
        }
    }
}