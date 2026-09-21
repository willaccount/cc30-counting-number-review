import { _decorator, Component, Node, sp, isValid, Texture2D, error, ImageAsset, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

interface FileEntry { file: File; dir: string; }

@ccclass('BaseLoadAssetModule')
export default class BaseLoadAssetModule extends Component {

    @property(Node)
    fontHolder: Node = null;

    private _dynamicNodes: Node[] = [];

    /**
     * Drag & Drop handler
     * ──────────────────────────────────────────────────────────
     */
    private _dragOverHandler = (e: DragEvent) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        this._showDropOverlay(); 
    };
    private _dragLeaveHandler = (e: DragEvent) => { 
        if (!e.relatedTarget) {
            this._hideDropOverlay();
        }
    };
    private _dropHandler = (e: DragEvent) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        this._hideDropOverlay(); 
        this._handleDrop(e); 
    };

    private _dropOverlay: HTMLElement | null = null;
    private _folderBtn: HTMLElement | null = null;
    private _dragCounter = 0;

    onLoad() {
        this._createFolderBtn();
        this._createDropOverlay();
        this._setupDragDrop();
    }

    onDestroy() {
        document.body.removeEventListener('dragover', this._dragOverHandler);
        document.body.removeEventListener('dragleave', this._dragLeaveHandler);
        document.body.removeEventListener('drop', this._dropHandler);
        if (this._dropOverlay && this._dropOverlay.parentNode) {
            this._dropOverlay.parentNode.removeChild(this._dropOverlay);
        }
        if (this._folderBtn && this._folderBtn.parentNode) {
            this._folderBtn.parentNode.removeChild(this._folderBtn);
        }
    }

    /**
     * Public API
     * ──────────────────────────────────────────────────────────
     */
    openFilePicker() {
        const input = document.createElement('input') as HTMLInputElement;
        input.type = 'file';
        (input as any).webkitdirectory = true;
        input.multiple = true;
        document.body.appendChild(input);
        input.onchange = () => {
            if (input.files && input.files.length > 0) {
                const entries: FileEntry[] = [];
                for (let i = 0; i < input.files.length; i++) {
                    const file = input.files[i];
                    const relPath = ((file as any).webkitRelativePath as string) || '';
                    const parts = relPath.split('/');
                    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
                    entries.push({ file: file, dir: dir });
                }
                this._processEntries(entries);
            }
            document.body.removeChild(input);
        };
        input.click();
    }

    removeAll() {
        this._dynamicNodes.forEach(node => {
            if (!isValid(node)) return;
            const skeleton = node.getComponent(sp.Skeleton);
            if (skeleton) this.node.emit('spine-removed', skeleton);
            node.destroy();
        });
        this._dynamicNodes = [];
    }

    /**
     * Generate html ui element
     * ──────────────────────────────────────────────────────────
     */
    private _createFolderBtn() {
        const el = document.createElement('div');
        el.title = 'Click to import spine files';
        el.style.cssText = [
            'position:fixed',
            'z-index:9998',
            'cursor:pointer',
            'display:flex',
            'flex-direction:column',
            'align-items:center',
            'gap:10px',
            'user-select:none',
            'top:10%',
            'left:10%',
            'transform:translate(-50%,-50%)',
            'transition:top 0.45s cubic-bezier(.4,0,.2,1),left 0.45s cubic-bezier(.4,0,.2,1),transform 0.45s cubic-bezier(.4,0,.2,1),opacity 0.3s',
        ].join(';');

        el.innerHTML = [
            '<div style="font-size:96px;line-height:1;filter:drop-shadow(0 4px 16px rgba(0,0,0,0.5))">📂</div>',
            '<div id="_spine_hint" style="',
                'color:rgba(255,255,255,0.75);',
                'font-size:15px;font-family:sans-serif;font-weight:500;',
                'text-shadow:0 2px 8px rgba(0,0,0,0.8);',
                'text-align:center;line-height:1.5;',
            '">Drop files or click to import<br><span style="font-size:12px;opacity:0.6">.json &nbsp;·&nbsp; .atlas &nbsp;·&nbsp; .png</span></div>',
        ].join('');

        el.addEventListener('click', () => this.openFilePicker());
        document.body.appendChild(el);
        this._folderBtn = el;
    }

    private _dockFolderBtn() {
        const el = this._folderBtn;
        if (!el) return;
        const hint = el.querySelector('#_spine_hint') as HTMLElement;
        if (hint) hint.style.display = 'none';
        const icon = el.querySelector('div') as HTMLElement;
        if (icon) icon.style.fontSize = '36px';
        el.style.top = 'calc(100% - 70px)';
        el.style.left = '20px';
        el.style.transform = 'none';
        el.style.opacity = '0.85';
        el.title = 'Click to import more spine files';
    }

    private _createDropOverlay() {
        const el = document.createElement('div');
        el.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0', 'z-index:99999',
            'display:none', 'align-items:center', 'justify-content:center',
            'flex-direction:column', 'gap:16px',
            'background:rgba(0,0,0,0.65)',
            'border:4px dashed #7eb8f7',
            'pointer-events:none',
            'transition:opacity 0.15s',
        ].join(';');

        el.innerHTML = [
            '<div style="font-size:64px;line-height:1;">📂</div>',
            '<div style="',
                'color:#7eb8f7;',
                'font-size:22px;font-weight:600;',
                'font-family:sans-serif;',
                'text-shadow:0 2px 8px rgba(0,0,0,0.8);',
                'letter-spacing:0.5px;',
            '">Drop spine files or folders here</div>',
            '<div style="',
                'color:#aac8f0;',
                'font-size:13px;font-family:sans-serif;',
                'text-shadow:0 1px 4px rgba(0,0,0,0.8);',
            '">.json &nbsp;+&nbsp; .atlas &nbsp;+&nbsp; .png</div>',
        ].join('');

        document.body.appendChild(el);
        this._dropOverlay = el;
    }

    private _showDropOverlay() {
        this._dragCounter++;
        if (this._dropOverlay) this._dropOverlay.style.display = 'flex';
    }

    private _hideDropOverlay() {
        this._dragCounter = 0;
        if (this._dropOverlay) this._dropOverlay.style.display = 'none';
    }

    private _setupDragDrop() {
        document.body.addEventListener('dragover', this._dragOverHandler);
        document.body.addEventListener('dragleave', this._dragLeaveHandler);
        document.body.addEventListener('drop', this._dropHandler);
    }

    private async _handleDrop(e: DragEvent) {
        const items = e.dataTransfer && e.dataTransfer.items;
        if (!items || items.length === 0) return;

        const entries: FileEntry[] = [];
        const promises: Promise<void>[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const getEntry = (item as any).webkitGetAsEntry;
            const fsEntry  = getEntry ? getEntry.call(item) : null;
            if (fsEntry) {
                if (fsEntry.isDirectory) {
                    promises.push(this._readDirEntry(fsEntry, entries, fsEntry.name));
                } else {
                    promises.push(new Promise<void>(resolve => {
                        fsEntry.file((f: File) => { entries.push({ file: f, dir: '' }); resolve(); });
                    }));
                }
            } else {
                const f = item.getAsFile();
                if (f) entries.push({ file: f, dir: '' });
            }
        }

        await Promise.all(promises);
        if (entries.length > 0) this._processEntries(entries);
    }

    /**
     * File processing
     * ─────────────────────────────────────────────────────
     */
    private _readDirEntry(dirEntry: any, out: FileEntry[], dirPath: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const reader = dirEntry.createReader();
            const subs: Promise<void>[] = [];

            const loop = () => {
                reader.readEntries((batch: any[]) => {
                    if (batch.length === 0) {
                        Promise.all(subs).then(() => resolve()).catch(reject);
                        return;
                    }
                    for (let i = 0; i < batch.length; i++) {
                        const entry = batch[i];
                        if (entry.isFile) {
                            subs.push(new Promise<void>(res => {
                                entry.file((f: File) => { out.push({ file: f, dir: dirPath }); res(); });
                            }));
                        } else if (entry.isDirectory) {
                            subs.push(this._readDirEntry(entry, out, dirPath + '/' + entry.name));
                        }
                    }
                    loop();
                }, reject);
            };
            loop();
        });
    }

    protected _processEntries(entries: FileEntry[]) {
        const groups = new Map<string, { dir: string; base: string; name: string; json?: File; atlas?: File; img?: File }>();

        entries.forEach(function(e) {
            const file = e.file;
            const dir = e.dir;
            const parts = file.name.split('.');
            const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
            if (ext !== 'json' && ext !== 'atlas' && ext !== 'png' && ext !== 'jpg') return;

            const base = file.name.replace(/\.[^.]+$/, '');
            const key = dir ? (dir + '/' + base) : base;

            if (!groups.has(key)) {
                groups.set(key, { dir: dir, base: base, name: base });
            }
            const g = groups.get(key);
            if (ext === 'json') {
                g.json = file;
            }
            else if (ext === 'atlas') {
                g.atlas = file;
            }
            else if (ext === 'png' || ext === 'jpg') {
                g.img = file;
            }
        });

        // Với mỗi spine, gom tất cả imgs trong cùng dir (hỗ trợ multi-atlas page)
        groups.forEach(g => {
            if (!g.json || !g.atlas) return;
            const imgs: File[] = [];
            groups.forEach(function(other) {
                if (other.img && other.dir === g.dir) {
                    imgs.push(other.img);
                }
            });
            if (imgs.length > 0) {
                this._loadSpineFromFiles(g.name, g.json, g.atlas, imgs);
            }
        });
    }

    private async _loadSpineFromFiles(name: string, jsonFile: File, atlasFile: File, imgFiles: File[]) {
        try {
            const skeletonData = await this._buildSkeletonData(jsonFile, atlasFile, imgFiles);
            this._spawnSpine(skeletonData, name);
        } catch (err) {
            error('[LoadSpine] Failed to load:', name, err);
        }
    }

    /**
     * File readers
     * ─────────────────────────────────────────────────────
     */
    protected _readText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = e => resolve(e.target.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    protected _readTexture(file: File): Promise<Texture2D> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const texture = new Texture2D();
                    const imageAsset = new ImageAsset(img);
                    texture.image = imageAsset;
                    resolve(texture);
                };
                img.onerror = reject;
                img.src = e.target.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    protected _readImageAsset(file: File): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const imageAsset = new ImageAsset(img);
                    const spriteFrame = SpriteFrame.createWithImage(imageAsset);
                    resolve(spriteFrame);
                };
                img.onerror = reject;
                img.src = e.target.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    private async _buildSkeletonData(jsonFile: File, atlasFile: File, imgFiles: File[]): Promise<sp.SkeletonData> {
        // 1. Đọc text trước — chưa đụng tới textures
        const jsonText = await this._readText(jsonFile);
        const atlasText = await this._readText(atlasFile);

        // 2. Parse page names từ atlas (dòng .png/.jpg sau dòng trống hoặc đầu file)
        const pageNames: string[] = [];
        const atlasLines = atlasText.split('\n');
        for (let i = 0; i < atlasLines.length; i++) {
            const line = atlasLines[i].trim();
            const prevLine = i > 0 ? atlasLines[i - 1].trim() : '';
            if (line.length === 0) continue;
            if ((i === 0 || prevLine.length === 0) && /\.(png|jpg|jpeg)$/i.test(line)) {
                pageNames.push(line);
            }
        }
        if (pageNames.length === 0 && imgFiles.length > 0) {
            pageNames.push(imgFiles[0].name);
        }

        // 3. Với mỗi page name, tìm đúng file rồi mới load texture
        const textures: Texture2D[] = [];
        const textureNames: string[]   = [];
        for (let p = 0; p < pageNames.length; p++) {
            const pageName = pageNames[p];
            let imgFile = imgFiles[0]; // fallback
            for (let t = 0; t < imgFiles.length; t++) {
                if (imgFiles[t].name.toLowerCase() === pageName.toLowerCase()) {
                    imgFile = imgFiles[t];
                    break;
                }
            }
            const tex = await this._readTexture(imgFile);
            textures.push(tex);
            textureNames.push(pageName);
        }

        const skeletonData = new sp.SkeletonData();
        (skeletonData as any)._skeletonJson = JSON.parse(jsonText);
        (skeletonData as any).atlasText = atlasText;
        (skeletonData as any).textures = textures;
        (skeletonData as any).textureNames = textureNames;
        return skeletonData;
    }

    /**
     * Spawn
     * ───────────────────────────────────────────────────────────────
     */
    private _spawnSpine(skeletonData: sp.SkeletonData, name: string) {
        const node   = new Node(name);
        const holder = this.fontHolder || this.node;
        holder.addChild(node);

        const skeleton = node.addComponent(sp.Skeleton);
        skeleton.skeletonData = skeletonData;
        skeleton.premultipliedAlpha = false;

        // Play anim đầu tiên nếu có
        const skJson = (skeletonData as any)._skeletonJson;
        const animsJson = skJson && skJson.animations ? skJson.animations : {};
        const anims = Object.keys(animsJson);
        if (anims.length > 0) skeleton.setAnimation(0, anims[0], false);

        this._dynamicNodes.push(node);
        this._dockFolderBtn();
        this.node.emit('spine-loaded', skeleton);
    }
}
