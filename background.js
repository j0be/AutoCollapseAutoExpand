let tabGroupActiveTabIdCache = {};

function collapseTabGroup(tabGroupId) {
    chrome.tabGroups.update(tabGroupId, { collapsed: true })
        //This makes sure we have access to collapse: "Tabs cannot be edited right now (user may be dragging a tab"
        .catch(() => { return setTimeout(collapseTabGroup.bind(this, tabGroupId), 100); });
}

function handleTabChange(tabId) {
    chrome.tabs.get(tabId).then(tab => {
        if (tab.groupId > -1) {
            tabGroupActiveTabIdCache[tab.groupId] = tabId;
        }

        chrome.tabGroups.query({}, tabGroups => {
            tabGroups.filter(tabGroup => {
                return tabGroup.id !== tab.groupId;
            }).forEach(tabGroup => {
                collapseTabGroup(tabGroup.id);
            });
        });
    });
}

chrome.tabs.onActivated.addListener(activeInfo => handleTabChange(activeInfo.tabId));
chrome.tabs.onAttached.addListener(tabId => handleTabChange(tabId));
chrome.tabs.onMoved.addListener(tabId => handleTabChange(tabId));

chrome.tabGroups.onUpdated.addListener(async (updatedTabGroup) => {
    if (!updatedTabGroup.collapsed) {
        let tabId = tabGroupActiveTabIdCache[updatedTabGroup.id];
        if (!tabId) {
            await chrome.tabs.query({ groupId: updatedTabGroup.id })
                .then(tabs => {
                    tabId = tabs.sort((a, b) => String(a.index).localeCompare(String(b.index), { numeric: true }))[0].id;
                });
        }

        chrome.tabs.get(tabId)
            .then(tab => chrome.tabs.highlight({ 'tabs': tab.index }), () => {});
    }
});