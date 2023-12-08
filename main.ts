import { addIcon, Notice, Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { ISettings } from 'src/conf/settings';
import { SettingsTab } from 'src/gui/settings-tab';
import { CardsService } from 'src/services/cards';
import { Anki } from 'src/services/anki';
import { noticeTimeout, flashcardsIcon } from 'src/conf/constants';

export default class ObsidianFlashcard extends Plugin {
    private settings: ISettings
    private cardsService: CardsService
    private lastGenRecentTime: Date //最后用处理最近文件的时间

    async onload() {
        addIcon("flashcards", flashcardsIcon)

        // TODO test when file did not insert flashcards, but one of them is in Anki already
        const anki = new Anki()
        this.settings = await this.loadData() || this.getDefaultSettings()
        this.cardsService = new CardsService(this.app, this.settings)

        const statusBar = this.addStatusBarItem();
        (window as any).qxx_flashcard_plugin = this;
        this.addCommand({
            id: 'generate-flashcard-current-file',
            name: 'Generate for the current file',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile()
                if (activeFile) {
                    if (!checking) {
                        this.generateCards(activeFile)
                    }
                    return true;
                }
                return false;
            }
        });

        this.addCommand({
            id: 'generate-flashcard-opened-files',
            name: 'Generate for the opened files',
            checkCallback: (checking: boolean) => {
                if (!checking) {
                    this.generateOpenedCards()
                }
                return true;
            }
        });
        this.addCommand({
            id: 'generate-flashcard-recent-files',
            name: 'Generate for the recent files',
            checkCallback: (checking: boolean) => {
                if (!checking) {
                    this.generateRecentfilesCards()
                }
                return true;
            }
        });

        this.addRibbonIcon('flashcards', 'Generate flashcards', () => {
            const activeFile = this.app.workspace.getActiveFile()
            if (activeFile) {
                this.generateCards(activeFile)
            } else {
                new Notice("Open a file before")
            }
        });

        this.addSettingTab(new SettingsTab(this.app, this));

        this.registerInterval(window.setInterval(() =>
            anki.ping().then(() => statusBar.setText('Anki ⚡️')).catch(() => statusBar.setText('')), 15 * 1000
        ));
    }

    async onunload() {
        await this.saveData(this.settings);
    }

    private getDefaultSettings(): ISettings {
        return { contextAwareMode: true, sourceSupport: false, codeHighlightSupport: false, inlineID: false, contextSeparator: " > ", deck: "Default", folderBasedDeck: true, flashcardsTag: "card", inlineSeparator: "::", inlineSeparatorReverse: ":::", defaultAnkiTag: "obsidian", ankiConnectPermission: false, otherConfigs: '' }
    }
    getOtherConfigs(): any {
        const defaultConfig = {
            recentFilesCount: 50
        }
        let configs = this.settings.otherConfigs;
        if (!configs) {
            return defaultConfig
        }
        try {
            let json = JSON.parse(configs);
            json = Object.assign(defaultConfig, json);
            return json
        } catch (error) {
            console.error('getOtherConfigs error', error)
        }
        return defaultConfig
    }

    private generateCards(activeFile: TFile, title?: String) {
        return this.cardsService.execute(activeFile).then(res => {
            for (const r of res) {
                let msg = r;
                if (title) {
                    msg = `【${title}】${r}`
                }
                // new Notice(msg, noticeTimeout)
                this.showMsg(msg)
            }
            console.log("generateCards", res)
        }).catch(err => {
            Error(err)
        })
    }
    private showMsg(msg: String, type?: String): void {
        const notice = new Notice("", 5000);
        let color = "red"
        if (msg.toLowerCase().includes("error")) {
            color = "red"
        } else if (
			msg.includes("successful") ||
			msg.includes("moved in new deck") 
		) {
            color = "green"
        } else if (msg.includes("Nothing to do")) {
            color = "white"
        }
        // @ts-ignore
        notice.noticeEl.innerHTML = `<span style="color:${color}">${msg}</span>`;

    }

    //qxx 处理打开的标签页
    private async generateOpenedCards() {
        console.info("generateOpenedCards start")
        const items = this.getOpenItems()
        const files = items.map(n => n.view?.file)
        const fileSet = new Set(files)
        for (let file of fileSet) {
            console.debug("generateOpenedCards file", file)
            await this.generateCards(file, file.name)
        }
    }
    // 处理最近打开的文件, 需要recent-files-obsidian插件
    // 处理逻辑: 选择最近的recentFilesCount个文件, 只处理lastGenRecentTime之后修改过的
    // todo: 这个逻辑可以优化,用一段时间再说
    private async generateRecentfilesCards() {
        const oneDayBefore = new Date(new Date().getTime() - 12 * 3600 * 1000)
        this.lastGenRecentTime = this.lastGenRecentTime || oneDayBefore;
        console.info("generateRecentfilesCards start", this.lastGenRecentTime)
        const recentFiles = app.plugins.plugins['recent-files-obsidian']?.data?.recentFiles;
        if (!recentFiles || recentFiles.length <= 0) {
            this.showMsg("there is no recentFiles")
            return;
        }
        // recentFiles是array, 元素的属性:
        // basename: "obsidian 插件 开发"
        // path: "可搜索/input/obsidian 插件 开发.md"
        const fileCount = this.getOtherConfigs().recentFilesCount;
        const parseFiles = recentFiles.slice(0, fileCount);
        const parseTFiles: TFile[] = parseFiles
            .map((n: any) => this.app.vault.getAbstractFileByPath(n.path))
            .filter((file : TFile)=>{
            if (file.stat.mtime < this.lastGenRecentTime.getTime()) {
                console.debug('generateRecentfilesCards file contine', file)
                return false
            }
            return true
        })
        const fileSet = new Set(parseTFiles)
        if(fileSet.size <=0){
            this.showMsg("no recent file to generate")
            return
        }
        this.showMsg(fileSet.size + " recent files to generate")

        for (let file of fileSet) {
            console.debug("generateRecentfilesCards file", file)
            await this.generateCards(file, file.name)
        }
        this.lastGenRecentTime = new Date();
    }

    //copy from switcher++ src/Handlers/editorHandler.ts
    getOpenItems(): WorkspaceLeaf[] {
        // const { excludeViewTypes, includeSidePanelViewTypes } = this.settings;
        const excludeViewTypes = ['empty'];
        // const includeSidePanelViewTypes = ['backlink', 'image', 'markdown', 'pdf'];
        const includeSidePanelViewTypes = ['markdown'];

        return this.getOpenLeaves(excludeViewTypes, includeSidePanelViewTypes);
    }
    /**
    * Returns a array of all open WorkspaceLeaf taking into account
    * excludeMainPanelViewTypes and includeSidePanelViewTypes.
    * @param  {string[]} excludeMainPanelViewTypes?
    * @param  {string[]} includeSidePanelViewTypes?
    * @returns WorkspaceLeaf[]
    */
    getOpenLeaves(
        excludeMainPanelViewTypes?: string[],
        includeSidePanelViewTypes?: string[],
    ): WorkspaceLeaf[] {
        const leaves: WorkspaceLeaf[] = [];

        const saveLeaf = (l: WorkspaceLeaf) => {
            const viewType = l.view?.getViewType();

            if (this.isMainPanelLeaf(l)) {
                if (!excludeMainPanelViewTypes?.includes(viewType)) {
                    leaves.push(l);
                }
            } else if (includeSidePanelViewTypes?.includes(viewType)) {
                leaves.push(l);
            }
        };

        this.app.workspace.iterateAllLeaves(saveLeaf);
        return leaves;
    }
    /**
    * Determines if a leaf belongs to the main editor panel (workspace.rootSplit or
    * workspace.floatingSplit) as opposed to the side panels
    * @param  {WorkspaceLeaf} leaf
    * @returns boolean
    */
    isMainPanelLeaf(leaf: WorkspaceLeaf): boolean {
        const { workspace } = this.app;
        const root = leaf?.getRoot();
        return root === workspace.rootSplit || root === workspace.floatingSplit;
    }
}