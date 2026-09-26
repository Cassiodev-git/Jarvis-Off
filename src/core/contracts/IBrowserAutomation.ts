export interface BrowserTab {
    index: number;
    title: string;
    url: string;
}

export interface IBrowserAutomation {
    open(url: string): Promise<string>;
    search(query: string): Promise<string>;
    newTab(url?: string): Promise<string>;
    closeTab(): Promise<string>;
    back(): Promise<string>;
    forward(): Promise<string>;
    refresh(): Promise<string>;
    readPage(): Promise<string>;
    listTabs(): Promise<BrowserTab[]>;
    click(selector: string): Promise<string>;
    clickText(text: string): Promise<string>;
    fillLabel(label: string, value: string): Promise<string>;
    selectTab(index: number): Promise<string>;
    requiresClickConfirmation(selector: string): Promise<boolean>;
    fill(selector: string, value: string): Promise<string>;
    selectVideo(index?: number, title?: string): Promise<string>;
    analyzeScreen(): Promise<Buffer>;
    searchAndRead(query: string): Promise<string>;
    close(): Promise<void>;
}
