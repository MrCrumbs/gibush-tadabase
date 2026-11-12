// פורט ל-JS של chunker.py מ-zolo-lab/flow-he (מצב "הקלטה רציפה", cut_at="start")
class SilenceChunker {
  constructor({ sr = 16000, minS = 10, maxS = 20, silenceS = 1.5, frameS = 0.03,
                absTh = 0.004, relTh = 0.25, padS = 0.4, smooth = 5 } = {}) {
    Object.assign(this, { sr, absTh, relTh, smooth });
    this.frame = Math.round(frameS * sr);
    this.minN = Math.round(minS * sr); this.maxN = Math.round(maxS * sr);
    this.silFrames = Math.max(1, Math.floor(silenceS / frameS));
    this.padFrames = Math.max(0, Math.floor(padS / frameS));
    this.buf = new Float32Array(0); this.speech = 0; this.pos = 0;
  }
  rms(x) { const n = Math.floor(x.length / this.frame), r = new Float64Array(n);
    for (let i = 0; i < n; i++) { let s = 0; for (let j = i * this.frame; j < (i + 1) * this.frame; j++) s += x[j] * x[j]; r[i] = Math.sqrt(s / this.frame); }
    return r; }
  th() { return Math.max(this.absTh, this.relTh * this.speech); }
  feed(x) {                      // x: Float32Array במונו 16kHz; מחזיר [{start, audio}] מוכנים לתמלול
    const b = new Float32Array(this.buf.length + x.length); b.set(this.buf); b.set(x, this.buf.length); this.buf = b;
    const t = this.th(), loud = Array.from(this.rms(x)).filter(v => v > t);
    if (loud.length) { const m = loud.reduce((a, c) => a + c, 0) / loud.length; this.speech = this.speech ? 0.9 * this.speech + 0.1 * m : m; }
    const out = []; let cut;
    while ((cut = this.findCut()) != null) {
      out.push({ start: this.pos / this.sr, audio: this.buf.slice(0, cut) });
      this.buf = this.buf.slice(cut); this.pos += cut;
    }
    return out;
  }
  findCut() {
    if (this.buf.length < this.minN) return null;
    const rms = this.rms(this.buf), k = this.smooth; let q = rms;
    if (k > 1 && rms.length >= k) {               // חציון נע (~150ms): נשימה לא שוברת שקט
      const lo = Math.floor(k / 2); q = new Float64Array(rms.length);
      for (let i = 0; i < rms.length; i++) { const w = [];
        for (let j = i - lo; j < i - lo + k; j++) w.push(rms[Math.min(rms.length - 1, Math.max(0, j))]);
        w.sort((a, c) => a - c); q[i] = w[Math.floor(k / 2)]; }
    }
    let th = this.th();
    if (k > 1 && q.length >= 20) {                 // סף לפי רעש הרקע (אחוזון 15), עם תקרה
      const tail = Array.from(q.slice(-333)).sort((a, c) => a - c);
      const nf = tail[Math.floor(0.15 * (tail.length - 1))];
      th = Math.max(th, Math.min(2.5 * nf, 0.012, this.speech ? 0.6 * this.speech : 0.012));
    }
    const startF = Math.floor(this.minN / this.frame); let run = 0;
    for (let i = startF; i < q.length; i++) {
      run = q[i] < th ? run + 1 : 0;
      if (run >= this.silFrames) return (i - run + 1 + this.padFrames) * this.frame; // חותכים בתחילת השקט
    }
    if (this.buf.length >= this.maxN) {            // אין שקט: חותכים בנקודה השקטה ביותר בשנייה האחרונה
      const lo = Math.max(startF, Math.floor((this.maxN - this.sr) / this.frame)), hi = Math.floor(this.maxN / this.frame);
      let best = lo; for (let i = lo; i < hi; i++) if (rms[i] < rms[best]) best = i;
      return best * this.frame;
    }
    return null;
  }
  flush() { const r = { start: this.pos / this.sr, audio: this.buf }; this.pos += this.buf.length; this.buf = new Float32Array(0); return r; }
}
function isSilent(x, sr = 16000, minSpeechS = 0.2) {   // קטע בלי דיבור — לא שולחים לשרת
  const f = Math.round(0.03 * sr), n = Math.floor(x.length / f); if (!n) return true;
  const r = []; for (let i = 0; i < n; i++) { let s = 0; for (let j = i * f; j < (i + 1) * f; j++) s += x[j] * x[j]; r.push(Math.sqrt(s / f)); }
  const srt = [...r].sort((a, c) => a - c), floor = srt[Math.floor(0.10 * (n - 1))];
  const th = Math.max(0.004, Math.min(3 * floor, 0.008));
  return r.filter(v => v > th).length * 0.03 < minSpeechS;
}
if (typeof module !== 'undefined') module.exports = { SilenceChunker, isSilent };
