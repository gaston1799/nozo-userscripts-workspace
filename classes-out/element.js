class element {
        static get br() {
            return new element("br");
        }
        constructor(name, obj) {
            //findhref2(id('skin-message'))[0].constructor.name

            this.element = name.constructor.name.includes('HTML') && (name) || (function () {
                for (let i in arguments[1]) {
                    arguments[0].setAttribute(i, arguments[1][i]);
                }
                return arguments[0];
            })(document.createElement(arguments[0]), arguments[1]);
        }
        style(obj) {
            for (let i in obj) {
                this.element.style[i] = obj[i];
            }
            return this;
        }
        append(target, ...targets) {
            this.element.append(target.element || target);
            console.log("T:", { targets, fe: targets && targets.forEach })
            for (let i = 0; i < targets.length; i++) {
                let a = targets[i];
                console.log('Appending:', { element: a, target: this })
                this.element.append(a.element || a);
            }
            return this;
        }
        appendTo(target) {
            (target.element || typeof target == 'string' ? document.querySelector(target) : target).append(this.element);
            return this;
        }
        on(event, a) {
            this.element[`on${event}`] = a;
            return this;
        }
        set(prop, value) {
            this.element[prop] = value;
            return this;
        }
        remove() {
            this.element.remove();
            return this;
        }
        get() {
            return this.element[arguments[0]];
        }
        get children() {
            return new (class $ {
                constructor(arr) {
                    for (var i = 0; i < arr.length; i += 1) {
                        this[i] = arr[i];
                    }

                    // length is readonly
                    Object.defineProperty(this, "length", {
                        get: function () {
                            return arr.length;
                        }
                    });

                    // a HTMLCollection is immutable
                    Object.freeze(this);
                }
                item(i) {
                    return this[i] != null ? this[i] : null;
                }
                namedItem(name) {
                    for (var i = 0; i < this.length; i += 1) {
                        if (this[i].id === name || this[i].name === name) {
                            return this[i];
                        }
                    }
                    return null;
                }
                get toArray() {
                    return [...this];
                }
            })([...this.element.children]);
        }
    }
