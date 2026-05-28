class CachedBushResource extends CachedMapResource {
                    constructor(raw) {
                        super(raw, "bushes");
                    }
                    getFarmKind() {
                        return "food";
                    }
                }
