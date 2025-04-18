package altermarkive.guardian

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.google.android.material.button.MaterialButton
import com.google.android.material.tabs.TabLayout

class Waves : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.signals, container, false)
        setupTabs(view)
        setupEmergencyButton(view)
        return view
    }

    private fun setupTabs(view: View) {
        val tabs: TabLayout = view.findViewById(R.id.tabs)
        activity?.runOnUiThread {
            for (index in Surface.CHARTS.indices) {
                val tab = tabs.newTab()
                tab.text = Surface.CHARTS[index].label
                tabs.addTab(tab, index, index == 0)
            }
        }
        tabs.addOnTabSelectedListener(view.findViewById(R.id.surface))
    }

    private fun setupEmergencyButton(view: View) {
        view.findViewById<MaterialButton>(R.id.emergency_button).setOnClickListener {
            activity?.let { activity ->
                val intent = Intent(activity, FallDetectedActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                activity.startActivity(intent)
            }
        }
    }
}