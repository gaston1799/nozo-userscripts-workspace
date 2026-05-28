class Animtext {
                    // ANIMATED TEXT:
                    constructor() {
                        // INIT:
                        this.init = function (x, y, scale, speed, life, text, color) {
                            this.x = x;
                            this.y = y;
                            this.color = color;
                            this.scale = scale;
                            this.startScale = this.scale;
                            this.maxScale = scale * 1.5;
                            this.scaleSpeed = 0.7;
                            this.speed = speed;
                            this.life = life;
                            this.text = text;
                            this.acc = 1;
                            this.alpha = 0;
                            this.maxLife = life;
                            this.ranX = UTILS.randFloat(-1, 1);
                        };

                        // UPDATE:
                        this.update = function (delta) {
                            if (this.life) {
                                this.life -= delta;
                                if (config.anotherVisual) {
                                    this.y -= this.speed * delta * this.acc;
                                    this.acc -= delta / (this.maxLife / 2.5);
                                    if (this.life <= 200) {
                                        if (this.alpha > 0) {
                                            this.alpha = Math.max(0, this.alpha - (delta / 300));
                                        }
                                    } else {
                                        if (this.alpha < 1) {
                                            this.alpha = Math.min(1, this.alpha + (delta / 100));
                                        }
                                    }
                                    this.x += this.ranX;
                                } else {
                                    this.y -= this.speed * delta;
                                }
                                this.scale += this.scaleSpeed * delta;
                                if (this.scale >= this.maxScale) {
                                    this.scale = this.maxScale;
                                    this.scaleSpeed *= -1;
                                } else if (this.scale <= this.startScale) {
                                    this.scale = this.startScale;
                                    this.scaleSpeed = 0;
                                }
                                if (this.life <= 0) {
                                    this.life = 0;
                                }
                            }
                        };

                        // RENDER:
                        this.render = function (ctxt, xOff, yOff) {
                            ctxt.lineWidth = 10;
                            ctxt.fillStyle = this.color;
                            ctxt.font = this.scale + "px " + (config.anotherVisual ? "Ubuntu" : "Hammersmith One");
                            if (config.anotherVisual) {
                                ctxt.globalAlpha = this.alpha;
                                ctxt.strokeStyle = darkOutlineColor;
                                ctxt.strokeText(this.text, this.x - xOff, this.y - yOff);
                            }
                            ctxt.fillText(this.text, this.x - xOff, this.y - yOff);
                            ctxt.globalAlpha = 1;
                        };
                    }
                }
