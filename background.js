let tabGroupActiveTabIdCache = {};

chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId).then(tab => {
        if (tab.groupId > -1) {
            tabGroupActiveTabIdCache[tab.groupId] = activeInfo.tabId;
        }

        chrome.tabGroups.query({}, tabGroups => {
            tabGroups.filter(tabGroup => {
                return tabGroup.id !== tab.groupId;
            }).forEach(tabGroup => {
                setTimeout(() => { chrome.tabGroups.update(tabGroup.id, { collapsed: true }); }, 100);
            });
        });
    });
});

chrome.tabGroups.onUpdated.addListener(updatedTab => {
    if (!updatedTab.collapsed && tabGroupActiveTabIdCache[updatedTab.id]) {
        chrome.tabs.get(updatedTab.id, function(tab) {
            chrome.tabs.highlight({ 'tabs': tab.index }, function(data) {
                console.log('updated', data);
            });
        });
    }
});