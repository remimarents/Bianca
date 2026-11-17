// Unlock on a game gesture, including Safari on iPhone; no separate sound control.
window.GuessSounds = class {
    constructor() {
        this.context = null;
        this.loading = null;
        this.buffers = {};
        this.sources = new Set();
        this.sequence = 0;
    }
    unlock() {
        try {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) return Promise.resolve();
            if (!this.context) {
                this.context = new Context();
                this.gain = this.context.createGain();
                this.gain.gain.value = 0.65;
                this.gain.connect(this.context.destination);
            }
            const resumed = this.context.state === 'running' ? Promise.resolve() : this.context.resume();
            if (!this.loading) {
                this.loading = Promise.all(['wrong', 'correct', 'win'].map(async name => {
                    const response = await fetch(`assets/sounds/${name}.wav`);
                    if (!response.ok) throw new Error('Audio unavailable');
                    this.buffers[name] = await this.context.decodeAudioData(await response.arrayBuffer());
                })).catch(() => { this.loading = null; });
            }
            return Promise.all([resumed, this.loading]).catch(() => {});
        } catch { return Promise.resolve(); }
    }
    stop() {
        this.sequence++;
        for (const source of this.sources) {
            try { source.stop(); } catch {}
            source.disconnect();
        }
        this.sources.clear();
    }
    async play(...names) {
        this.stop();
        const sequence = this.sequence;
        await this.unlock();
        if (sequence !== this.sequence || document.hidden || this.context?.state !== 'running') return;
        let time = this.context.currentTime;
        for (const name of names) {
            const buffer = this.buffers[name];
            if (!buffer) continue;
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.gain);
            this.sources.add(source);
            source.onended = () => { this.sources.delete(source); source.disconnect(); };
            source.start(time);
            time += buffer.duration + 0.08;
        }
    }
};
