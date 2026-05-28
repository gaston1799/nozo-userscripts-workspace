class MapPing {
                    constructor(color, scale) {
                        this.init = function (x, y) {
                            this.scale = 0;
                            this.x = x;
                            this.y = y;
                            this.active = true;
                        };
                        this.update = function (ctxt, delta, opts = {}) {
                            const compute = opts.compute !== false;
                            const draw = opts.draw !== false;
                            if (this.active) {
                                if (compute) {
                                    this.scale += 0.05 * delta;
                                }
                                if (compute && this.scale >= scale) {
                                    this.active = false;
                                } else if (draw && ctxt) {
                                    ctxt.globalAlpha = (1 - Math.max(0, this.scale / scale));
                                    ctxt.beginPath();
                                    ctxt.arc((this.x / config.mapScale) * mapDisplay.width, (this.y / config.mapScale)
                                        * mapDisplay.width, this.scale, 0, 2 * Math.PI);
                                    ctxt.stroke();
                                }
                            }
                        };
                        this.color = color;
                    }
                }
