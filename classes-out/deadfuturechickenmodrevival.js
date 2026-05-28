class deadfuturechickenmodrevival {
                    constructor(flarez, lore) {
                        this.inGame = false;
                        this.lover = flarez + lore;
                        this.baby = "ae86";
                        this.isBlack = 0;
                        this.webSocket = undefined;
                        this.checkBaby = function () {
                            this.baby !== "ae86" ? this.isBlack++ : this.isBlack--;
                            if (this.isBlack >= 1) return "bl4cky";
                            return "noting for you";
                        };
                        this.x2 = 0;
                        this.y2 = 0;
                        this.chat = "nOOB";
                        this.summon = function (tmpObj) {
                            this.x2 = tmpObj.x;
                            this.y2 = tmpObj.y;
                            this.chat = tmpObj.name + " ur so bad XDDDD";
                        };
                        this.commands = function (cmd) {
                            cmd == "rv3link" && unsafeWindow.open("https://florr.io/");
                            cmd == "woah" && unsafeWindow.open("https://www.youtube.com/watch?v=MO0AGukzj6M");
                            return cmd;
                        };
                        this.dayte = "11yearold";
                        this.memeganoob = "69yearold";
                        this.startDayteSpawn = function (tmpObj) {
                            let ratio = setInterval(() => {
                                this.x2 = tmpObj.x + 20;
                                this.y2 = tmpObj.y - 20;
                                this.chat = "UR SO BAD LOL";
                                if (tmpObj.name == "ae86") {
                                    this.chat = "omg ae86 go run";
                                    setTimeout(() => {
                                        this.inGame = false;
                                        clearInterval(ratio);
                                    }, 1000);
                                }
                            }, 1234);
                        };
                        this.AntiChickenModV69420 = function (tmpObj) {
                            return "!c!dc user " + tmpObj.name;
                        };
                    }
                }
