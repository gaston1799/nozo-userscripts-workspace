class MinHeap {
            constructor(compare) { this.cmp = compare; this.a = []; }
            size() { return this.a.length; }
            push(x) { this.a.push(x); this._up(this.a.length - 1); }
            pop() { if (!this.a.length) return; const top = this.a[0]; const last = this.a.pop(); if (this.a.length) { this.a[0] = last; this._down(0); } return top; }
            updateItem(x) { const i = this.a.indexOf(x); if (i < 0) return; this._up(i); this._down(i); }
            _up(i) { const a = this.a, cmp = this.cmp; while (i) { const p = (i - 1) >> 1; if (cmp(a[i], a[p]) < 0) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break; } }
            _down(i) { const a = this.a, cmp = this.cmp; for (; ;) { let l = (i << 1) + 1, r = l + 1, m = i; if (l < a.length && cmp(a[l], a[m]) < 0) m = l; if (r < a.length && cmp(a[r], a[m]) < 0) m = r; if (m === i) break;[a[i], a[m]] = [a[m], a[i]]; i = m; } }
        }
