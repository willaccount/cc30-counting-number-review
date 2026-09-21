import { _decorator, Vec3, Node, Label, tween, Layout } from 'cc';
import { BaseAssetReviewModule } from './BaseAssetReviewModule';
import { DragAndDropModule } from './DragAndDropModule';
const { ccclass, property } = _decorator;

interface FontState {
    active: boolean,
    scale: number,
    text: string,
    startValue: number,
    endValue: number,
    countingDuration: number,
    startCounting: any
}

interface FontInfo {
    fontName: string,
    folderKey: string,
    label: Label,
    state: FontState,
    folder: any,
}

@ccclass('FontReviewModule')
export class FontReviewModule extends BaseAssetReviewModule {

    @property(Node)
    labelHolder: Node = null;

    @property({ type: Node }) 
    totalWinText: Node = null;

    protected _fontMap: Map<string, FontInfo> = new Map();
    tweenCountingNumber: any = null;

    onLoad(): void {
        super.onLoad();
    }

    protected _initGui() {
        super._initGui();
        const mainGuiState = {
            isShowTotalWinText: false,
            onShowTotalWinText: (value: boolean) => {
                mainGuiState.isShowTotalWinText = value;
                this.totalWinText.active = value;
                this.setHolderLayout(value);
            }
        }
        this._mainGui.add(mainGuiState, 'isShowTotalWinText').name('Show Total Win Text').onChange(mainGuiState.onShowTotalWinText);
    }

    protected onAssetLoaded(asset: any, name: string): void {
        const node = new Node(`${name}`);
        const countingNumber = node.addComponent(Label);
        this.labelHolder.addChild(node);
        countingNumber.string = "";
        countingNumber.font = asset;
        // this.labels.push(countingNumber);

        this.createDatGuiController(countingNumber, name);
    }

    createDatGuiController(font: Label, folderName: string) {
        const fontState: FontState = {
            active: font.node.active,
            scale: 1,
            text: "",
            startValue: 0,
            endValue: 0,
            countingDuration: 0,
            startCounting: () => {
                this.startCountingNumber(font, fontState.startValue, fontState.endValue, fontState.countingDuration);
            }
        }
        const folderKey = this._uniqueFolderKey(folderName);
        const folder = this._mainGui.addFolder(folderKey);
        folder.close();
        folder.add(fontState, 'active').name('Active').onChange((val: boolean) => {
            font.node.active = val
        });
        folder.add(fontState, 'scale', 0, 5, 0.001).name('Scale').onChange((val: number) => {
            font.node.scale = new Vec3(val, val, val)
        });
        folder.add(fontState, 'text').name('Text').onChange((val: string) => {
            font.string = val;
        });
        folder.add(fontState, 'startValue').name('Start Value').onChange((value: number) => {
            fontState.startValue = value;
        });
        folder.add(fontState, 'endValue').name('End Value').onChange((value: number) => {
            fontState.endValue = value;
        });
        folder.add(fontState, 'countingDuration').name('Counting Duration').onChange((value: number) => {
            fontState.countingDuration = value;
        });
        folder.add(fontState, 'startCounting').name('Start Counting');

        const fontInfo: FontInfo = {
            fontName: folderName,
            folderKey,
            label: font,
            state: fontState,
            folder
        }
        this._fontMap.set(folderKey, fontInfo);
    }

    startCountingNumber(label, start, end, duration): void {
        if (!label) return;

        const _target = { value: start };

        if (this.tweenCountingNumber) {
            this.tweenCountingNumber.stop();
        }
        this.tweenCountingNumber = tween(_target)
            .to(duration, { value: end }, {
                progress: (start, end, current, ratio) => {
                    label.string = this.formatMoney(current);
                    return start + (end - start) * ratio;
                }
            })
            .call(() => {
                label.string = this.formatMoney(end);
                this.tweenCountingNumber = null;
            })
        this.tweenCountingNumber.start();
    }

    _addDraggable(spine) {
        if (spine.node.getComponent(DragAndDropModule)) return;
        return spine.node.addComponent(DragAndDropModule);
    }

    isNumeric(text: string): boolean {
        return /^\d+$/.test(text);
    }

    formatMoney(amount, decimalCount = 0) {
        if (amount < 0) return "0";
        // const splitStr = toFixed(amount, decimalCount).split(".");
        const splitStr = amount.toFixed(decimalCount).split(".");

        let decimal = ',';
        let thousands = '.';
    
        const decimalStr = splitStr[1] || "";
        const integerArr = splitStr[0].split("");
        let index = integerArr.length;
        while ((index -= 3) > 0) {
            integerArr.splice(index, 0, thousands);
        }
        if (decimalStr) {
            integerArr.push(decimal, decimalStr);
        }
        return integerArr.join("");
    }

    setHolderLayout(value: boolean): void {
        const layout = this.labelHolder && this.labelHolder.getComponent(Layout);
        if (layout) layout.enabled = value;
    }
}

