class Petal {
                    constructor(x, y) {
                        this.x = x;
                        this.y = y;
                        this.damage = 10;
                        this.health = 10;
                        this.maxHealth = this.health;
                        this.active = false;
                        this.alive = false;
                        this.timer = 1500;
                        this.time = 0;
                        this.damaged = 0;
                        this.alpha = 1;
                        this.scale = 9;
                        this.visScale = this.scale;
                    }
                }
