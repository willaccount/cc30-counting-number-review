import { _decorator, Component, Node, error, UITransform, Layout } from 'cc';
const { ccclass, property } = _decorator;

import dat from "../Scripts/dat.gui.min.js";
const gui = new dat.GUI();
const fontManager = gui.addFolder('Font Manager');

@ccclass('BaseAssetReviewModule')
export class BaseAssetReviewModule extends Component {
    @property(Node)
    tableManager: Node = null;

    @property(Node)
    spineHolder: Node = null;

    _rootGui: any = null;
    _mainGui: any = null;
    private _spineMap: Map<string, any> = new Map();

    protected _removeAll() {
    }

    protected _uniqueFolderKey(baseName: string): string {
        if (!this._spineMap.has(baseName)) return baseName;
        let idx = 2;
        while (this._spineMap.has(baseName + ' #' + idx)) idx++;
        return baseName + ' #' + idx;
    }

    onLoad() {
        this._initGui();

        const loader = this.getComponent('LoadSpine') as any;
        if (loader && !loader.spineHolder) loader.spineHolder = this.spineHolder;

        this.node.on('asset-loaded', this.onAssetLoaded, this);
        this.node.on('asset-removed', this.onAssetRemoved, this);
    }

    start() {
        const layout = this.spineHolder && this.spineHolder.getComponent(Layout);
        if (layout) layout.enabled = false;
    }

    update(dt: number) {
        this._spineMap.forEach(info => {
            if (info.currentDuration > 0 && info.spine.timeScale !== 0) {
                const spState = (info.spine as any)._state;
                const track = spState && spState.getCurrent(0);
                if (track) {
                    info.state.progress = info.state.loop
                        ? track.trackTime % info.currentDuration
                        : Math.min(track.trackTime, info.currentDuration);
                }
            }
            info.queueTicks.forEach(tick => tick(dt));
        });
    }

    protected onAssetLoaded(asset: any, name: string): void {}

    protected onAssetRemoved(asset: any): void {}

    protected _removeSpineFromGui(asset: any) {}

    protected _initGui() {
        gui.domElement.parentElement.style.zIndex = '1000';
        this._rootGui = gui;

        const importActions = {
            import: () => {
                const ls = this.getComponent('LoadSpine') as any;
                if (ls) ls.openFilePicker();
            },
            removeAll: () => this._removeAll(),
        };
        gui.add(importActions, 'import').name('📁 Import Spine');
        const removeBtn = gui.add(importActions, 'removeAll').name('✕ Remove All Spines');
        const removeEl: HTMLElement = removeBtn.domElement.querySelector('button') || removeBtn.domElement;
        removeEl.style.color = '#ff4444';
        this._mainGui = gui.addFolder('Fonts');
        this._mainGui.open();
    }

    _addDraggable(asset) {
        // if (spine.node.getComponent(DragAndDropModule)) return;
        // return spine.node.addComponent(DragAndDropModule);
    }
}

