package altermarkive.guardian

class Cache(count: Int, size: Int, var position: Int, value: Double) {
    val buffers: Array<DoubleArray> = Array(count) { DoubleArray(size) { value } }

    fun copyInto(cache: Cache) {
        if (this.buffers.size != cache.buffers.size) {
            return
        }
        for (i: Int in this.buffers.indices) {
            if (this.buffers[i].size != cache.buffers[i].size) {
                return
            }
        }
        for (i: Int in this.buffers.indices) {
                this.buffers[i].copyInto(cache.buffers[i])
        }
        cache.position = position
    }
}