class Node {
                    constructor(x, y, g, h, parent = null) {
                        this.x = x;
                        this.y = y;
                        this.g = g; // Cost from start node
                        this.h = h; // Heuristic (estimated cost to end)
                        this.f = g + h; // Total cost
                        this.parent = parent;
                    }
                }
