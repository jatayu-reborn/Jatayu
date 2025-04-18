package altermarkive.guardian

import android.content.Context
import io.ipfs.api.IPFS
import io.ipfs.api.NamedStreamable
import io.ipfs.multiaddr.MultiAddress
import java.io.File
import java.io.IOException
import java.util.*
import java.util.concurrent.Executors

class Upload internal constructor() {
    companion object {
        private val TAG = Upload::class.java.name
        private val IPFS_URL: MultiAddress = MultiAddress("/dnsaddr/ipfs.infura.io/tcp/5001/https")
        private var ipfs: IPFS? = null

        internal fun go(context: Context, root: String) {
            val ipfs = this.ipfs
            ipfs ?: return
            val zipped: Array<String>? = DataBase.list(root, DataBase.FILTER_ZIP)
            if (zipped != null && zipped.isNotEmpty()) {
                Arrays.sort(zipped)
                for (file in zipped) {
                    val wrapper = NamedStreamable.FileWrapper(File(root, file))
                    try {
                        val result = ipfs.add(wrapper)[0]
                        val url = "https://cloudflare-ipfs.com/ipfs/${result.hash.toBase58()}"
                        val message = "Uploaded: $url"
                        val userDetails = UserDetails[context]
                        if (userDetails != null && "" != userDetails) {
                            SendDm.sms(context, UserDetails[context], message)
                        }
                        Trace.i(TAG, message)
                    } catch (exception: IOException) {
                        val failure = android.util.Log.getStackTraceString(exception)
                        Trace.e(TAG, "Failed to upload the file $file:\n $failure")
                    }
                }
            }
        }
    }

    init {
        if (ipfs == null) {
            Executors.newSingleThreadExecutor().execute {
                ipfs = IPFS(IPFS_URL)
            }
        }
    }
}