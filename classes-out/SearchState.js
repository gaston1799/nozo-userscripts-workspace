class SearchState {
            constructor() {
                this.pointsToAvoid = {};         // y -> {x:1}
                this.startX = this.startY = undefined;
                this.endX = this.endY = undefined;
                this.nodeHash = {};              // y -> { x: Node }
                this.openList = undefined;       // MinHeap<Node>
                this.callback = undefined;       // (path|null)=>void
            }
        }
