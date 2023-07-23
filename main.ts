import { addIcon, Notice, Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { ISettings } from 'src/conf/settings';
import { SettingsTab } from 'src/gui/settings-tab';
import { CardsService } from 'src/services/cards';
import { Anki } from 'src/services/anki';
import { noticeTimeout, flashcardsIcon } from 'src/conf/constants';

export default class ObsidianFlashcard extends Plugin {
    private settings: ISettings
    private cardsService: CardsService

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
        return { contextAwareMode: true, sourceSupport: false, codeHighlightSupport: false, inlineID: false, contextSeparator: " > ", deck: "Default", folderBasedDeck: true, flashcardsTag: "card", inlineSeparator: "::", inlineSeparatorReverse: ":::", defaultAnkiTag: "obsidian", ankiConnectPermission: false }
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
        let color = "white"
        if (msg.toLowerCase().includes("error")) {
            color = "red"
        } else if (msg.includes("successful")) {
            color = "green"
        }
        // @ts-ignore
        notice.noticeEl.innerHTML = `<span style="color:${color}">${msg}</span>`;

    }

    //qxx
    private async generateOpenedCards() {
        console.info("generateOpenedCards start")
        const items = this.getItems()
        const files = items.map(n => n.view?.file)
        const fileSet = new Set(files)
        for (let file of fileSet) {
            console.debug("generateOpenedCards file", file)
            await this.generateCards(file, file.name)
        }
    }
    //copy from switcher++ src/Handlers/editorHandler.ts
    getItems(): WorkspaceLeaf[] {
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