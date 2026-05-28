class CachedMapResource {
                    constructor(raw, bucket) {
                        this.bucket = bucket;
                        this.sid = raw.sid;
                        this.type = raw.type;
                        this.scale = raw.scale;
                        this.x = raw.x;
                        this.y = raw.y;
                        this.lastSeen = Date.now();
                    }
                    update(raw) {
                        this.type = raw.type;
                        this.scale = raw.scale;
                        this.x = raw.x;
                        this.y = raw.y;
                        this.lastSeen = Date.now();
                        return this;
                    }
                    getGameObject() {
                        return typeof findObjectBySid === "function" ? findObjectBySid(this.sid) : null;
                    }
                    refreshFromGameObject() {
                        const obj = this.getGameObject();
                        if (!obj) return this;
                        return this.update({
                            sid: obj.sid,
                            type: obj.type,
                            scale: obj.scale,
                            x: obj.x,
                            y: obj.y
                        });
                    }
                    _pickXY(target, suffix = 2) {
                        const tx = Number.isFinite(target?.["x" + suffix]) ? target["x" + suffix] : target?.x;
                        const ty = Number.isFinite(target?.["y" + suffix]) ? target["y" + suffix] : target?.y;
                        return {
                            x: Number.isFinite(tx) ? tx : 0,
                            y: Number.isFinite(ty) ? ty : 0
                        };
                    }
                    distTo(target = player, suffix = 2) {
                        const t = this._pickXY(target, suffix);
                        return Math.hypot(this.x - t.x, this.y - t.y);
                    }
                    dirTo(target = player, suffix = 2) {
                        const t = this._pickXY(target, suffix);
                        return Math.atan2(this.y - t.y, this.x - t.x);
                    }
                    canAutoFarm(target = player, maxDist = 450, suffix = 2) {
                        return this.distTo(target, suffix) <= maxDist;
                    }
                    getFarmKind() {
                        return "generic";
                    }
                }
