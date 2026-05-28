class AiManager {

                    // AI MANAGER:
                    constructor(ais, AI, players, items, objectManager, config, UTILS, scoreCallback, server) {

                        // AI TYPES:
                        this.aiTypes = [
                            {
                                id: 0,
                                src: "cow_1",
                                killScore: 150,
                                health: 500,
                                weightM: .8,
                                speed: 95e-5,
                                turnSpeed: .001,
                                scale: 72,
                                drop: ["food", 50]
                            }, {
                                id: 1,
                                src: "pig_1",
                                killScore: 200,
                                health: 800,
                                weightM: .6,
                                speed: 85e-5,
                                turnSpeed: .001,
                                scale: 72,
                                drop: ["food", 80]
                            }, {
                                id: 2,
                                name: "Bull",
                                src: "bull_2",
                                hostile: !0,
                                dmg: 20,
                                killScore: 1e3,
                                health: 1800,
                                weightM: .5,
                                speed: 94e-5,
                                turnSpeed: 74e-5,
                                scale: 78,
                                viewRange: 800,
                                chargePlayer: !0,
                                drop: ["food", 100]
                            }, {
                                id: 3,
                                name: "Bully",
                                src: "bull_1",
                                hostile: !0,
                                dmg: 20,
                                killScore: 2e3,
                                health: 2800,
                                weightM: .45,
                                speed: .001,
                                turnSpeed: 8e-4,
                                scale: 90,
                                viewRange: 900,
                                chargePlayer: !0,
                                drop: ["food", 400]
                            }, {
                                id: 4,
                                name: "Wolf",
                                src: "wolf_1",
                                hostile: !0,
                                dmg: 8,
                                killScore: 500,
                                health: 300,
                                weightM: .45,
                                speed: .001,
                                turnSpeed: .002,
                                scale: 84,
                                viewRange: 800,
                                chargePlayer: !0,
                                drop: ["food", 200]
                            }, {
                                id: 5,
                                name: "Quack",
                                src: "chicken_1",
                                dmg: 8,
                                killScore: 2e3,
                                noTrap: !0,
                                health: 300,
                                weightM: .2,
                                speed: .0018,
                                turnSpeed: .006,
                                scale: 70,
                                drop: ["food", 100]
                            }, {
                                id: 6,
                                name: "MOOSTAFA",
                                nameScale: 50,
                                src: "enemy",
                                hostile: !0,
                                dontRun: !0,
                                fixedSpawn: !0,
                                spawnDelay: 6e4,
                                noTrap: !0,
                                colDmg: 100,
                                dmg: 40,
                                killScore: 8e3,
                                health: 18e3,
                                weightM: .4,
                                speed: 7e-4,
                                turnSpeed: .01,
                                scale: 80,
                                spriteMlt: 1.8,
                                leapForce: .9,
                                viewRange: 1e3,
                                hitRange: 210,
                                hitDelay: 1e3,
                                chargePlayer: !0,
                                drop: ["food", 100]
                            }, {
                                id: 7,
                                name: "Treasure",
                                hostile: !0,
                                nameScale: 35,
                                src: "crate_1",
                                fixedSpawn: !0,
                                spawnDelay: 12e4,
                                colDmg: 200,
                                killScore: 5e3,
                                health: 2e4,
                                weightM: .1,
                                speed: 0,
                                turnSpeed: 0,
                                scale: 70,
                                spriteMlt: 1
                            }, {
                                id: 8,
                                name: "MOOFIE",
                                src: "wolf_2",
                                hostile: !0,
                                fixedSpawn: !0,
                                dontRun: !0,
                                hitScare: 4,
                                spawnDelay: 3e4,
                                noTrap: !0,
                                nameScale: 35,
                                dmg: 10,
                                colDmg: 100,
                                killScore: 3e3,
                                health: 7e3,
                                weightM: .45,
                                speed: .0015,
                                turnSpeed: .002,
                                scale: 90,
                                viewRange: 800,
                                chargePlayer: !0,
                                drop: ["food", 1e3]
                            }, {
                                id: 9,
                                name: "Ã°Å¸â€™â‚¬MOOFIE",
                                src: "wolf_2",
                                hostile: !0,
                                fixedSpawn: !0,
                                dontRun: !0,
                                hitScare: 50,
                                spawnDelay: 6e4,
                                noTrap: !0,
                                nameScale: 35,
                                dmg: 12,
                                colDmg: 100,
                                killScore: 3e3,
                                health: 9e3,
                                weightM: .45,
                                speed: .0015,
                                turnSpeed: .0025,
                                scale: 94,
                                viewRange: 1440,
                                chargePlayer: !0,
                                drop: ["food", 3e3],
                                minSpawnRange: .85,
                                maxSpawnRange: .9
                            }, {
                                id: 10,
                                name: "Ã°Å¸â€™â‚¬Wolf",
                                src: "wolf_1",
                                hostile: !0,
                                fixedSpawn: !0,
                                dontRun: !0,
                                hitScare: 50,
                                spawnDelay: 3e4,
                                dmg: 10,
                                killScore: 700,
                                health: 500,
                                weightM: .45,
                                speed: .00115,
                                turnSpeed: .0025,
                                scale: 88,
                                viewRange: 1440,
                                chargePlayer: !0,
                                drop: ["food", 400],
                                minSpawnRange: .85,
                                maxSpawnRange: .9
                            }, {
                                id: 11,
                                name: "Ã°Å¸â€™â‚¬Bully",
                                src: "bull_1",
                                hostile: !0,
                                fixedSpawn: !0,
                                dontRun: !0,
                                hitScare: 50,
                                dmg: 20,
                                killScore: 5e3,
                                health: 5e3,
                                spawnDelay: 1e5,
                                weightM: .45,
                                speed: .00115,
                                turnSpeed: .0025,
                                scale: 94,
                                viewRange: 1440,
                                chargePlayer: !0,
                                drop: ["food", 800],
                                minSpawnRange: .85,
                                maxSpawnRange: .9
                            }]

                        // SPAWN AI:
                        this.spawn = function (x, y, dir, index) {
                            let tmpObj = ais.find((tmp) => !tmp.active);
                            if (!tmpObj) {
                                tmpObj = new AI(ais.length, objectManager, players, items, UTILS, config, scoreCallback, server);
                                ais.push(tmpObj);
                            }
                            tmpObj.init(x, y, dir, index, this.aiTypes[index]);
                            return tmpObj;
                        };
                    }

                }
