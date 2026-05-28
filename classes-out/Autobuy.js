class Autobuy {
                    constructor(buyHat, buyAcc) {
                        this.buyHatOrder = buyHat;
                        this.buyAccOrder = buyAcc;

                        this.pending = null;
                        this.lastBuy = 0;
                        this.buyDelay = 180; // slightly above 1 game tick, since tick is ~111ms
                    }

                    getList(type) {
                        return type === 0 ? store.hats : store.accessories;
                    }

                    getOrder(type) {
                        return type === 0 ? this.buyHatOrder : this.buyAccOrder;
                    }

                    typeName(type) {
                        return type === 0 ? "hat" : "acc";
                    }

                    canTryBuy() {
                        const now = Date.now();

                        if (this.pending && now - this.pending.time < 700) {
                            return false;
                        }

                        if (this.pending && now - this.pending.time >= 700) {
                            console.warn(
                                `[AutoBuy] stale pending cleared: ${this.typeName(this.pending.type)} id=${this.pending.id}`
                            );
                            this.pending = null;
                        }

                        if (now - this.lastBuy < this.buyDelay) {
                            return false;
                        }

                        return true;
                    }

                    isOwned(type, id) {
                        return type === 0 ? player.skins[id] : player.tails[id];
                    }

                    findItem(type, id) {
                        return this.getList(type).find(e => e.id == id);
                    }

                    getNext(type) {
                        const order = this.getOrder(type);

                        for (let i = 0; i < order.length; i++) {
                            const id = order[i];
                            const item = this.findItem(type, id);

                            if (!item) continue;
                            if (this.isOwned(type, id)) continue;

                            return item;
                        }

                        return null;
                    }

                    logNext() {
                        const nextHat = this.getNext(0);
                        const nextAcc = this.getNext(1);

                        console.log(
                            `[AutoBuy] next hat: ${nextHat
                                ? `${nextHat.name} id=${nextHat.id} price=${nextHat.price} ${player.points >= nextHat.price ? "READY" : `need=${nextHat.price - player.points}`}`
                                : "none"
                            }`
                        );

                        console.log(
                            `[AutoBuy] next acc: ${nextAcc
                                ? `${nextAcc.name} id=${nextAcc.id} price=${nextAcc.price} ${player.points >= nextAcc.price ? "READY" : `need=${nextAcc.price - player.points}`}`
                                : "none"
                            }`
                        );
                    }

                    tryBuyList(order, type) {
                        if (!player || !this.canTryBuy()) return false;

                        for (let i = 0; i < order.length; i++) {
                            const id = order[i];
                            const item = this.findItem(type, id);

                            if (!item) continue;
                            if (this.isOwned(type, id)) continue;
                            if (player.points < item.price) continue;

                            console.log(
                                `[AutoBuy] buying ${this.typeName(type)}: ${item.name} id=${id} price=${item.price} points=${player.points}`
                            );

                            packet("c", 1, id, type);

                            this.pending = {
                                id,
                                type,
                                name: item.name,
                                price: item.price,
                                time: Date.now()
                            };

                            this.lastBuy = Date.now();

                            this.logNext();

                            return true;
                        }

                        return false;
                    }

                    tick() {
                        if (!player) return;

                        if (this.pending && this.isOwned(this.pending.type, this.pending.id)) {
                            console.log(
                                `[AutoBuy] bought ${this.typeName(this.pending.type)}: ${this.pending.name} id=${this.pending.id}`
                            );

                            this.pending = null;
                            this.logNext();
                        }

                        // hats first, then accs only if no hat bought this tick
                        if (this.tryBuyList(this.buyHatOrder, 0)) return;
                        this.tryBuyList(this.buyAccOrder, 1);
                    }
                }
