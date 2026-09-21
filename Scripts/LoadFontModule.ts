import { _decorator, BitmapFont, Texture2D } from 'cc';
import BaseLoadAssetModule from './BaseLoadAssetModule';
const { ccclass } = _decorator;

interface FileEntry { file: File; dir: string; }

@ccclass('LoadFontModule')
export default class LoadFontModule extends BaseLoadAssetModule {

    protected _processEntries(entries: FileEntry[]) {
        const groups = new Map<string, { dir: string; base: string; name: string; fnt?: File; img?: File }>();

        entries.forEach(function(e) {
            const file = e.file;
            const dir = e.dir;
            const parts = file.name.split('.');
            const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
            if (ext !== 'fnt' && ext !== 'png' && ext !== 'jpg') return;

            const base = file.name.replace(/\.[^.]+$/, '');
            const key = dir ? (dir + '/' + base) : base;

            if (!groups.has(key)) {
                groups.set(key, { dir: dir, base: base, name: base });
            }
            const g = groups.get(key);
            if (ext === 'fnt') {
                g.fnt = file;
            } else if (ext === 'png' || ext === 'jpg') {
                g.img = file;
            }
        });

        groups.forEach((g) => {
            if (!g.fnt) return;
            this.loadFontFromFiles(g.name, g.fnt, g.img);
        });
    }

    async loadFontFromFiles(name: string, fnt: File, img: File): Promise<void> {
        try {
            const fontData = await this._buildFontData(fnt, img);
            this._spawnFont(fontData, name);
        } catch (err) {
            console.error("Fail to load fonts: ", err);
        }
    }

    private async _buildFontData(fnt: File, imgFile: File): Promise<BitmapFont> {

        const fntText = await this._readText(fnt);
        const name = fnt.name.replace(".fnt", "");
        const imageAsset = await this._readImageAsset(imgFile);

        const bitmapFontData = new BitmapFont();
        const fntConfig = await this.createFntConfig(fntText);
        fntConfig.fontSize = 30;
        const fontDefDictionary = await this.createFontDefDictionary(fntConfig);
        const fileName = name;
        bitmapFontData.spriteFrame = imageAsset;
        bitmapFontData.fntConfig = fntConfig;
        bitmapFontData.spriteFrame = imageAsset;
        bitmapFontData.spriteFrame.name = fileName;
        bitmapFontData.fntConfig.atlasName = `${name}.png`;
        bitmapFontData.fntConfig.fontDefDictionary = fontDefDictionary;
        bitmapFontData.name = fileName;
        bitmapFontData.onLoaded();
        return bitmapFontData;
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

    _spawnFont(bitMapFontData: BitmapFont, name: string): void {
        this.node.emit("asset-loaded", bitMapFontData, name);
    }
}
