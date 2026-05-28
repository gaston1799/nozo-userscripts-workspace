class Html {
                    constructor() {
                        this.element = null;
                        this.action = null;
                        this.divElement = null;
                        this.startDiv = function (setting, func) {

                            let newDiv = document.createElement("div");
                            setting.id && (newDiv.id = setting.id);
                            setting.style && (newDiv.style = setting.style);
                            setting.class && (newDiv.className = setting.class);
                            this.element.appendChild(newDiv);
                            this.divElement = newDiv;

                            let addRes = new HtmlAction(newDiv);
                            typeof func == "function" && func(addRes);

                        };
                        this.addDiv = function (setting, func) {

                            let newDiv = document.createElement("div");
                            setting.id && (newDiv.id = setting.id);
                            setting.style && (newDiv.style = setting.style);
                            setting.class && (newDiv.className = setting.class);
                            setting.appendID && getEl(setting.appendID).appendChild(newDiv);
                            this.divElement = newDiv;

                            let addRes = new HtmlAction(newDiv);
                            typeof func == "function" && func(addRes);

                        };
                    };
                    set(id) {
                        this.element = getEl(id);
                        this.action = new HtmlAction(this.element);
                    };
                    resetHTML(text) {
                        if (text) {
                            this.element.innerHTML = ``;
                        } else {
                            this.element.innerHTML = ``;
                        }
                    };
                    setStyle(style) {

                        this.element.style = style;
                    };
                    setCSS(style) {
                        this.action.add(`<style>` + style + `</style>`);
                    };
                }
