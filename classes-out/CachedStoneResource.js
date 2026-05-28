class CachedStoneResource extends CachedMapResource {
                    constructor(raw) {
                        super(raw, "stones");
                    }
                    getFarmKind() {
                        return "stone";
                    }
                }
