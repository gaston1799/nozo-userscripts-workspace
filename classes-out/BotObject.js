class BotObject {
                    constructor(sid) {
                        this.sid = sid;
                        // INIT:
                        this.init = function (x, y, dir, scale, type, data, owner) {
                            data = data || {};
                            this.active = true;
                            this.x = x;
                            this.y = y;
                            this.scale = scale;
                            this.owner = owner;
                            this.id = data.id;
                            this.dmg = data.dmg;
                            this.trap = data.trap;
                            this.teleport = data.teleport;
                            this.isItem = this.id != undefined;
                        };

                    }
                }
