class CustomLogging {
                constructor(title) {
                    this.title = {
                        body: title || "---",
                        color: "darkgrey",
                        size: "1rem"
                    }
                    this.body = {
                        color: "#008f68",
                        size: "1rem"
                    };
                }

                setTitleBody(title) {
                    this.title.body = title;
                    return this;
                }

                setTitleStyle({ color, size }) {
                    if (color !== undefined) this.title.color = color;
                    if (size !== undefined) this.title.size = size;
                    return this;
                }

                setBodyStyle({ color, size }) {
                    if (color !== undefined) this.body.color = color;
                    if (size !== undefined) this.body.size = size;
                    return this;
                }

                log(body = "") {
                    console.log(
                        `%c${this.title.body} | %c${body}`,
                        `color: ${this.title.color}; font-weight: bold; font-size: ${this.title.size};`,
                        `color: ${this.body.color}; font-weight: bold; font-size: ${this.body.size}; text-shadow: 0 0 5px rgba(0,0,0,0.2);`
                    );
                }
            }
