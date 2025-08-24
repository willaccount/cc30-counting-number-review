import { _decorator, Component, Node, ImageAsset, tween, TextAsset, SpriteFrame, Label } from 'cc';
const { ccclass, property } = _decorator;

import dat from "../Scripts/dat.gui.min.js";
import { BitmapFont } from 'cc';
const gui = new dat.GUI();
const fontManager = gui.addFolder('Font Manager');

@ccclass('LoadFont')
export class LoadFont extends Component {
    @property({ type: Node }) importBtn: Node = null;
    @property({ type: Node }) labelHolder: Node = null;
    @property({ type: Node }) totalWinText: Node = null;

    private fntFiles: File[] = [];
    private pngFiles: File[] = [];
    private fontNames: string[] = [];
    private spriteFrames: SpriteFrame[] = [];
    private textAssets: TextAsset[] = [];
    private labels: Label[] = [];

    fontIndex: number = 0;
    currentLabelNode: Label = null;
    startValue: number = 0;
    endValue: number = 0;
    duration: number = 0;

    tweenCountingNumber = null;

    onLoad(): void {
        if (this.labelHolder) {
            this.labelHolder.active = false;
        }
    }

    start() {
        this.setupDatGui();
    }

    setupDatGui() {
        gui.domElement.style.position = 'relative';
        gui.domElement.style.top = '50px';
        gui.domElement.style.left = '-50px';
        gui.domElement.style.zIndex = '1000';

        const inputData = {
            startCountingValue: "",
            endCountingValue: "",
            countingDuration: "",
            isShowTotalWinText: true,
            onShowText: (value: boolean) => {
                inputData.isShowTotalWinText = value;
                this.totalWinText.active = value;
            },
            onChangeStartValue: (value: string) => {
                if (this.isNumeric(value)) {
                    inputData.startCountingValue = value;
                    this.startValue = Number(value);
                }
            },
            onChangeEndValue: (value: string) => {
                if (this.isNumeric(value)) {
                    inputData.endCountingValue = value;
                    this.endValue = Number(value);
                }
            },
            onChangeDuration: (value: string) => {
                if (this.isNumeric(value)) {
                    inputData.countingDuration = value;
                    this.duration = parseInt(value);
                }
            },
            startCounting: () => {
                this.startCountingNumber();
            }
        }
        gui.add(inputData, 'isShowTotalWinText').name('Show Total Win Text').onChange(inputData.onShowText);
        gui.add(inputData, 'startCountingValue').name('Start Value').onChange(inputData.onChangeStartValue);
        gui.add(inputData, 'endCountingValue').name('End Value').onChange(inputData.onChangeEndValue);
        gui.add(inputData, 'countingDuration').name('Counting Duration').onChange(inputData.onChangeDuration);
        gui.add(inputData, 'startCounting').name('Start Counting');
    }

    isNumeric(text: string): boolean {
        return /^\d+$/.test(text);
    }

    async importFontFolder(): Promise<void> {
        const input = window.document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;
        input.multiple = true;
        input.accept = ".json, .skel, .atlas";
        input.style.width = '400px';
        input.style.height = '100px';
        input.style.position = 'relative';
        input.style.bottom = '100px';
        input.style.left = '500px';
        document.body.appendChild(input);
        if (this.importBtn.active) {
            this.importBtn.active = false;
            this.labelHolder.active = true;
        }

        setTimeout(() => {
            input.click();
        }, 100);

        input.onchange = async () => {
            if (input.files) {
                if (input.files.length <= 0) return;

                for (let i = 0; i < input.files.length; i++) {
                    const file = input.files[i];
                    if (file.name.endsWith('.fnt')) {
                        this.fntFiles.push(file);
                        await this.getTextData(file);
                    } else if (file.name.endsWith('.png')) {
                        this.fontNames.push(file.name);
                        this.pngFiles.push(file);
                        await this.getSpriteFrameData(file);
                    }
                }
                await this.loadFontsFromFiles();
            } 
        }
        return Promise.resolve();
    }

    async getSpriteFrameData(file: File): Promise<void> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const imageAsset = new ImageAsset(img);
                    const spriteFrame = SpriteFrame.createWithImage(imageAsset);
                    spriteFrame.ensureMeshData();
                    this.spriteFrames.push(spriteFrame);
                    resolve();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    async getTextData(file: File): Promise<void> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                const textAsset = new TextAsset();
                textAsset.text = event.target.result as string;
                this.textAssets.push(textAsset);
                resolve();
            };
            reader.readAsText(file);
        });
    }

    async loadFontsFromFiles(): Promise<void> {
        for (let i = 0; i < this.fontNames.length; i++) {
            const guiName = this.fontNames[i];
            const textAsset = this.textAssets[i];
            const pngAsset = this.spriteFrames[i];
            const bitmapFont = await this.loadBitmapFont(textAsset, pngAsset, i);
            this.initLabelNode(bitmapFont, guiName);
        }
    }

    async loadBitmapFont(textAsset: TextAsset, spriteFrame: SpriteFrame, index: number): Promise<BitmapFont> {
        const bitmapFontData = new BitmapFont();
        const fntConfig = await this.createFntConfig(textAsset.text);
        fntConfig.fontSize = 30;
        const fontDefDictionary = await this.createFontDefDictionary(fntConfig);
        const fileName = this.fontNames[index].replace(".png", "");
        bitmapFontData.spriteFrame = spriteFrame;
        bitmapFontData.fntConfig = fntConfig;
        bitmapFontData.spriteFrame = this.spriteFrames[index];
        bitmapFontData.spriteFrame.name = fileName;
        bitmapFontData.fntConfig.atlasName = this.fontNames[index];
        bitmapFontData.fntConfig.fontDefDictionary = fontDefDictionary;
        bitmapFontData.name = fileName;
        bitmapFontData.onLoaded();
        return Promise.resolve(bitmapFontData);
    }

    initLabelNode(bitmapFontData: BitmapFont, folderName: string) {
        const node = new Node('LabelNode');
        const countingNumber = node.addComponent(Label);
        this.labelHolder.addChild(node);
        countingNumber.string = "";
        countingNumber.font = bitmapFontData;
        this.labels.push(countingNumber);

        this.createDatGuiController(folderName);
        this.fontIndex++;
    }

    async createFntConfig(text: string): Promise<any> {
        const lines = text.split('\n');
        const result: any = {
            pages: [],
            chars: [],
            kernings: [],
        };

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const type = parts.shift();
            const data: any = {};

            parts.forEach(part => {
                const [key, value] = part.split('=');
                if (key && value) {
                    const numValue = Number(value);
                    data[key] = isNaN(numValue) ? value.replace(/"/g, '') : numValue;
                }
            });

            switch (type) {
                case 'info':
                    result.info = data;
                    break;
                case 'common':
                    result.common = data;
                    break;
                case 'page':
                    result.pages.push(data);
                    break;
                case 'char':
                    result.chars.push(data);
                    break;
                case 'kerning':
                    result.kernings.push(data);
                    break;
            }
        });

        return Promise.resolve(result);
    }

    async createFontDefDictionary(fntConfig: any): Promise<any> {
        const fontDefDictionary: any = {};
        fntConfig.chars.forEach((charInfo: any) => {
            const rect = {
                x: charInfo.x,
                y: charInfo.y,
                width: charInfo.width,
                height: charInfo.height,
            };
            fontDefDictionary[charInfo.id] = {
                rect: rect,
                xOffset: charInfo.xoffset,
                yOffset: charInfo.yoffset,
                xAdvance: charInfo.xadvance,
                textureID: charInfo.page,
            };
        });
        return Promise.resolve(fontDefDictionary);
    }

    createDatGuiController(folderName: string) {
        const fontHolder = fontManager.addFolder(folderName);
        const fontData = {
            fontIndex: this.fontIndex,
            onActiveLabel: () => {
                this.hideAllLabels();
                this.labels[fontData.fontIndex].node.active = true;
                this.currentLabelNode = this.labels[fontData.fontIndex];
                this.currentLabelNode.string = "0";
            },
        };
        fontHolder.add(fontData, 'onActiveLabel').name('Active');
    }

    hideAllLabels(): void {
        if (!this.labels || this.labels.length <= 0) return;
        this.labels.forEach(label => {
            label.node.active = false;
        });
    }

    startCountingNumber(): void {
        if (!this.currentLabelNode) return;

        const _target = { value: this.startValue };

        if (this.tweenCountingNumber) {
            this.tweenCountingNumber.stop();
        }
        this.tweenCountingNumber = tween(_target)
            .to(this.duration, { value: this.endValue }, {
                progress: (start, end, current, ratio) => {
                    this.currentLabelNode.string = this.formatMoney(current);
                    return start + (end - start) * ratio;
                }
            })
            .call(() => {
                this.currentLabelNode.string = this.formatMoney(this.endValue);
                this.tweenCountingNumber = null;
            })
        this.tweenCountingNumber.start();
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
}

