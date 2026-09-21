import { _decorator, Component, Node, Camera, find, Vec2, v2, Vec3, UITransform, Touch } from 'cc';
const { ccclass } = _decorator;

@ccclass('DragAndDropModule')
export class DragAndDropModule extends Component {
    
    camera: Camera = null;
    isHolding: boolean = false;
    private _offset: Vec2 = v2();

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        this.camera = find("Canvas").getComponentInChildren(Camera);
    }

    private _screenToParentLocal(screenPos: Vec2): Vec3 {
        const worldPos = this.camera.screenToWorld(new Vec3(screenPos.x, screenPos.y, 0));
        return this.node.parent.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
    }

    onTouchStart(event: Touch) {
        this.isHolding = true;
        const localPos = this._screenToParentLocal(event.getLocation());
        this._offset = v2(localPos.x - this.node.getPosition().x, localPos.y - this.node.getPosition().y);
    }

    onTouchMove(event: Touch) {
        if (!this.isHolding) return;
        const localPos = this._screenToParentLocal(event.getLocation());
        this.node.setPosition(
            +(localPos.x - this._offset.x).toFixed(2),
            +(localPos.y - this._offset.y).toFixed(2),
            0
        );
    }

    onTouchEnd() {
        this.isHolding = false;
    }

    onDisable() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}

