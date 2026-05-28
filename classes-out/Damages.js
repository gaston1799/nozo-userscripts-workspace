class Damages {
                    constructor(items) {
                        // 0.75 1 1.125 1.5
                        this.calcDmg = function (dmg, val) {
                            return dmg * val;
                        };
                        this.getAllDamage = function (dmg) {
                            return [this.calcDmg(dmg, 0.75), dmg, this.calcDmg(dmg, 1.125), this.calcDmg(dmg, 1.5)];
                        };
                        this.weapons = [];
                        for (let i = 0; i < items.weapons.length; i++) {
                            let wp = items.weapons[i];
                            let name = wp.name.split(" ").length <= 1 ? wp.name : (wp.name.split(" ")[0] + "_" + wp.name.split(" ")[1]);
                            this.weapons.push(this.getAllDamage(i > 8 ? wp.Pdmg : wp.dmg));
                            this[name] = this.weapons[i];
                        }
                    }
                }
