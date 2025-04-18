package altermarkive.guardian

import android.os.Bundle
import androidx.preference.PreferenceFragmentCompat

class Controls : PreferenceFragmentCompat() {
    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        setPreferencesFromResource(R.xml.preferences, rootKey)
    }
}