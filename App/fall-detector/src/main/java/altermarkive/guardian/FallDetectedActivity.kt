package altermarkive.guardian

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Bundle
import android.os.CountDownTimer
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class FallDetectedActivity : AppCompatActivity() {
    companion object {
        const val REQUEST_CODE = 1001
        const val TAG = "FallDetectedActivity"
    }

    private var warningSound: MediaPlayer? = null
    private var countdownTimer: CountDownTimer? = null
    private var isFinishing = false
    private var wakeLock: PowerManager.WakeLock? = null
    private lateinit var keyguardManager: KeyguardManager

    @SuppressLint("ServiceCast")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d(TAG, "Activity starting...")
        
        // Make sure we can show over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        
        // These flags are needed for older Android versions
        window.addFlags(
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
        
        // Acquire wake lock to make sure screen turns on
        try {
            val pm = getSystemService(POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "guardian:FallDetectionWakeLock"
            )
            wakeLock?.acquire(10*60*1000L) // 10 minutes
        } catch (e: Exception) {
            Log.e(TAG, "Error acquiring wake lock: ${e.message}")
        }
        
        // Calculate time remaining from when fall was detected
        val fallDetectionTime = intent.getLongExtra("FALL_DETECTION_TIME", 0)
        val timeElapsed = if (fallDetectionTime > 0) {
            System.currentTimeMillis() - fallDetectionTime
        } else {
            0
        }
        
        // If more than 7 seconds have passed, immediately send alert
        if (timeElapsed >= 7000) {
            Log.d(TAG, "More than 7 seconds have passed, triggering alert immediately")
            userNeedsHelp()
            return
        }
        
        // Cancel notification timer since user has responded
        Tracker.singleton.cancelNotificationTimer()
        
        setContentView(R.layout.activity_fall_detected)
        
        // Initialize keyguard manager
        if (Build.VERSION.SDK_INT >= 27) {
            keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            try {
                keyguardManager.requestDismissKeyguard(this, null)
            } catch (e: Exception) {
                Log.e(TAG, "Error dismissing keyguard: ${e.message}")
            }
        }
        
        initializeUI()
        startWarningSound()
        
        // Start countdown with remaining time
        val remainingTime = maxOf(7000 - timeElapsed, 1000) // At least 1 second
        startCountdown(remainingTime)
        
        // Release the wake lock after 10 seconds
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                if (wakeLock?.isHeld == true) wakeLock?.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing wake lock: ${e.message}")
            }
        }, 10000)
    }

    private fun initializeUI() {
        findViewById<TextView>(R.id.status_text).text = 
            "Fall Detected!\nPress 'I'm Fine' within 7 seconds\nor emergency alert will be sent"

        // Hide help button as we're only using the fine button
        findViewById<Button>(R.id.help_button).visibility = View.GONE
        
        val fineButton = findViewById<Button>(R.id.error_button)
        fineButton.text = "I'm Fine"
        fineButton.setOnClickListener {
            userIsFine()
        }
    }

    private fun startWarningSound() {
        try {
            warningSound = MediaPlayer.create(this, R.raw.alarm).apply {
                isLooping = true
                start()
            }
        } catch (e: Exception) {
            Log.e("FallDetected", "Error playing sound: ${e.message}")
        }
    }

    private fun startCountdown(remainingTimeMs: Long = 7000) {
        countdownTimer = object : CountDownTimer(remainingTimeMs, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                try {
                    if (!isFinishing) {
                        findViewById<Button>(R.id.error_button)?.text = 
                            "I'm Fine (${millisUntilFinished/1000}s)"
                    }
                } catch (e: Exception) {
                    Log.e("FallDetected", "Error updating countdown: ${e.message}")
                }
            }

            override fun onFinish() {
                if (!isFinishing) {
                    userNeedsHelp()
                }
            }
        }.start()
    }

    private fun userIsFine() {
        isFinishing = true
        // Cancel notification timer
        Tracker.singleton.cancelNotificationTimer()
        cleanup()
        setResult(Activity.RESULT_CANCELED)
        Toast.makeText(this, "Stay safe!", Toast.LENGTH_SHORT).show()
        finish()
    }

    private fun userNeedsHelp() {
        isFinishing = true
        cleanup()
        
        // Send alert directly
        val tracker = Tracker.singleton
        val context = applicationContext
        if (context != null) {
            tracker.alert(context)
        }
        
        finish()
    }

    private fun cleanup() {
        try {
            countdownTimer?.cancel()
            countdownTimer = null

            warningSound?.apply {
                if (isPlaying) stop()
                release()
            }
            warningSound = null
        } catch (e: Exception) {
            Log.e("FallDetected", "Error in cleanup: ${e.message}")
        }
    }

    override fun onDestroy() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock in onDestroy: ${e.message}")
        }
        
        cleanup()
        super.onDestroy()
    }

    // Override back button to prevent accidental dismissal
    override fun onBackPressed() {
        // Prevent back button from dismissing without making a choice
        return
    }

    // Prevent Activity from being destroyed by system
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        // Reset the countdown if activity is restarted
        cleanup()
        startWarningSound()
        startCountdown()
    }
}
