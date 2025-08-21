import { _decorator, Component, Node, ImageAsset, assetManager, TextAsset, SpriteFrame, Label } from 'cc';
const { ccclass, property } = _decorator;

import dat from "../Scripts/dat.gui.min.js";
import { BitmapFont } from 'cc';
const gui = new dat.GUI();
const FontManager = gui.addFolder('Font Manager');

@ccclass('LoadFont')
export class LoadFont extends Component {
    @property({ type: Node }) importBtn: Node = null;
    @property({ type: Node }) labelHolder: Node = null;
    @property({ type: Label }) demoLabel: Label = null;

    private fntFiles: File[] = [];
    private pngFiles: File[] = [];
    private fontNames: string[] = [];
    private spriteFrames: SpriteFrame[] = [];
    private textAssets: TextAsset[] = [];

    start() {
        this.setupDatGui();
        console.log(this.demoLabel.font);
    }

    setupDatGui() {
        gui.domElement.style.position = 'relative';
        gui.domElement.style.top = '50px';
        gui.domElement.style.left = '-50px';
        gui.domElement.style.zIndex = '1000';

        const button = {
            message: 'Button clicked',
            function: () => {
            }
        }
        gui.add(button, 'function').name('Remove All Spines');
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
        this.importBtn.active = false;

        setTimeout(() => {
            input.click();
        }, 100);

        input.onchange = async () => {
            if (input.files) {
                if (input.files.length <= 0) return;

                for (let i = 0; i < input.files.length; i++) {
                    const file = input.files[i];
                    if (file.name.endsWith('.fnt')) {
                        await this.getTextData(file);
                    } else if (file.name.endsWith('.png')) {
                        this.fontNames.push(file.name);
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
            const textAsset = this.textAssets[i];
            const spriteFrameAsset = this.spriteFrames[i];
            const guiName = this.fontNames[i];
            const bitmapFontData = await this.loadBitmapFont(textAsset, spriteFrameAsset, i);
            this.initLabelNode(bitmapFontData, guiName);
        }
    }

    async loadFontRemote(): Promise<void> {
        return Promise.resolve();
    }

    async loadBitmapFont(textAsset: TextAsset, spriteFrame: SpriteFrame, index: number): Promise<BitmapFont> {
        const bitmapFontData = new BitmapFont();
        bitmapFontData.spriteFrame = spriteFrame;
        const fntConfig = await this.createFntConfig(textAsset.text);
        fntConfig.atlasName = this.fontNames[index];
        const fontDefDictionary = await this.createFontDefDictionary(fntConfig);
        bitmapFontData.fntConfig = fntConfig;
        bitmapFontData.fntConfig.fontDefDictionary = fontDefDictionary;
        bitmapFontData.fontSize = 30;
        bitmapFontData.name = this.fontNames[index];
        bitmapFontData.onLoaded();
        return Promise.resolve(bitmapFontData);
    }

    initLabelNode(bitmapFontData: BitmapFont, folderName: string) {
        const node = new Node('LabelNode');
        const countingNumber = node.addComponent(Label);
        this.labelHolder.addChild(node);
        countingNumber.string = "";
        countingNumber.font = bitmapFontData;
        countingNumber.string = "1234";
        console.log(countingNumber.font);
        // this.createDatGuiController(skeleton.skeletonData, folderName);
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
}

