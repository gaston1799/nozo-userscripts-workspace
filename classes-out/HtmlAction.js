class HtmlAction {
                    constructor(element) {
                        this.element = element;
                    };
                    add(code) {
                        if (!this.element) return undefined;
                        this.element.innerHTML += code;
                    };
                    newLine(amount) {
                        let result = `<br>`;
                        if (amount > 0) {
                            result = ``;
                            for (let i = 0; i < amount; i++) {
                                result += `<br>`;
                            }
                        }
                        this.add(result);
                    };
                    checkBox(setting) {
                        let newCheck = `<input type = "checkbox"`;
                        setting.id && (newCheck += ` id = ${setting.id}`);
                        setting.style && (newCheck += ` style = ${setting.style.replaceAll(" ", "")}`);
                        setting.class && (newCheck += ` class = ${setting.class}`);
                        setting.checked && (newCheck += ` checked`);
                        setting.onclick && (newCheck += ` onclick = ${setting.onclick}`);
                        newCheck += `>`;
                        this.add(newCheck);
                    };
                    text(setting) {
                        let newText = `<input type = "text"`;
                        setting.id && (newText += ` id = ${setting.id}`);
                        setting.style && (newText += ` style = ${setting.style.replaceAll(" ", "")}`);
                        setting.class && (newText += ` class = ${setting.class}`);
                        setting.size && (newText += ` size = ${setting.size}`);
                        setting.maxLength && (newText += ` maxLength = ${setting.maxLength}`);
                        setting.value && (newText += ` value = ${setting.value}`);
                        setting.placeHolder && (newText += ` placeHolder = ${setting.placeHolder.replaceAll(" ", "&nbsp;")}`);
                        newText += `>`;
                        this.add(newText);
                    };
                    select(setting) {
                        let newSelect = `<select`;
                        setting.id && (newSelect += ` id = ${setting.id}`);
                        setting.style && (newSelect += ` style = ${setting.style.replaceAll(" ", "")}`);
                        setting.class && (newSelect += ` class = ${setting.class}`);
                        newSelect += `>`;
                        for (let options in setting.option) {
                            newSelect += `<option value = ${setting.option[options].id}`
                            setting.option[options].selected && (newSelect += ` selected`);
                            newSelect += `>${options}</option>`;
                        }
                        newSelect += `</select>`;
                        this.add(newSelect);
                    };
                    button(setting) {
                        let newButton = `<button`;
                        setting.id && (newButton += ` id = ${setting.id}`);
                        setting.style && (newButton += ` style = ${setting.style.replaceAll(" ", "")}`);
                        setting.class && (newButton += ` class = ${setting.class}`);
                        setting.onclick && (newButton += ` onclick = ${setting.onclick}`);
                        newButton += `>`;
                        setting.innerHTML && (newButton += setting.innerHTML);
                        newButton += `</button>`;
                        this.add(newButton);
                    };
                    selectMenu(setting) {
                        let newSelect = `<select`;
                        if (!setting.id) {
                            alert("please put id skid");
                            return;
                        }
                        unsafeWindow[setting.id + "Func"] = function () { };
                        setting.id && (newSelect += ` id = ${setting.id}`);
                        setting.style && (newSelect += ` style = ${setting.style.replaceAll(" ", "")}`);
                        setting.class && (newSelect += ` class = ${setting.class}`);
                        newSelect += ` onchange = window.${setting.id + "Func"}()`;
                        newSelect += `>`;
                        let last;
                        let i = 0;
                        for (let options in setting.menu) {
                            newSelect += `<option value = ${"option_" + options} id = ${"O_" + options}`;
                            setting.menu[options] && (newSelect += ` checked`);
                            newSelect += ` style = "color: ${setting.menu[options] ? "#000" : "#fff"}; background: ${setting.menu[options] ? "#8ecc51" : "#cc5151"};">${options}</option>`;
                            i++;
                        }
                        newSelect += `</select>`;

                        this.add(newSelect);

                        i = 0;
                        for (let options in setting.menu) {
                            unsafeWindow[options + "Func"] = function () {
                                setting.menu[options] = getEl("check_" + options).checked ? true : false;
                                saveVal(options, setting.menu[options]);

                                getEl("O_" + options).style.color = setting.menu[options] ? "#000" : "#fff";
                                getEl("O_" + options).style.background = setting.menu[options] ? "#8ecc51" : "#cc5151";

                                //getEl(setting.id).style.color = setting.menu[options] ? "#8ecc51" : "#cc5151";

                            };
                            this.checkBox({ id: "check_" + options, style: `display: ${i == 0 ? "inline-block" : "none"};`, class: "checkB", onclick: `window.${options + "Func"}()`, checked: setting.menu[options] });
                            i++;
                        }

                        last = "check_" + getEl(setting.id).value.split("_")[1];
                        unsafeWindow[setting.id + "Func"] = function () {
                            getEl(last).style.display = "none";
                            last = "check_" + getEl(setting.id).value.split("_")[1];
                            getEl(last).style.display = "inline-block";

                            //getEl(setting.id).style.color = setting.menu[last.split("_")[1]] ? "#8ecc51" : "#fff";

                        };
                    };
                }
