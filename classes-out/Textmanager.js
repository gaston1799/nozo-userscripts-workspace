class Textmanager {
                    // TEXT MANAGER:
                    constructor() {
                        this.texts = [];
                        this.stack = [];

                        // UPDATE:
                        this.update = function (delta, ctxt, xOff, yOff) {
                            ctxt.textBaseline = "middle";
                            ctxt.textAlign = "center";
                            for (let i = 0; i < this.texts.length; ++i) {
                                if (this.texts[i].life) {
                                    this.texts[i].update(delta);
                                    this.texts[i].render(ctxt, xOff, yOff);
                                }
                            }
                        };

                        // SHOW TEXT:
                        this.showText = function (x, y, scale, speed, life, text, color) {
                            let tmpText;
                            for (let i = 0; i < this.texts.length; ++i) {
                                if (!this.texts[i].life) {
                                    tmpText = this.texts[i];
                                    break;
                                }
                            }
                            if (!tmpText) {
                                tmpText = new Animtext();
                                this.texts.push(tmpText);
                            }
                            tmpText.init(x, y, scale, speed, life, text, color);
                        };
                    }
                }
