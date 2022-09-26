let tabGroupActiveTabIdCache = {};
function throttle (func, wait = 100) {
  let timer = null;
  return function (...args) {
    if (timer === null) {
      timer = setTimeout(() => {
        func.apply(this, args);
        timer = null;
      }, wait);
    }
  };
}

function collapseTabGroup (tabGroupId) {
  chrome.tabGroups.update(tabGroupId, { collapsed: true })
    //This makes sure we have access to collapse: "Tabs cannot be edited right now (user may be dragging a tab"
    .catch(() => { return setTimeout(collapseTabGroup.bind(this, tabGroupId), 100); });
}

function handleTabChange (tabId) {
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

let tabThrottler = throttle(handleTabChange, 250);

chrome.tabs.onActivated.addListener(activeInfo => tabThrottler(activeInfo.tabId));
chrome.tabs.onAttached.addListener(tabId => tabThrottler(tabId));
chrome.tabs.onMoved.addListener(tabId => tabThrottler(tabId));

chrome.tabGroups.onUpdated.addListener(async (updatedTabGroup) => {
  setTimeout((async (updatedTabGroup) => {
    let currentTab = await chrome.tabs.query({ active: true, lastFocusedWindow: true }).catch(() => {}); //Swallow
    if (!updatedTabGroup.collapsed && currentTab.groupId !== updatedTabGroup.id) {
      let tabId = tabGroupActiveTabIdCache[updatedTabGroup.id];
      if (!tabId) {
        await chrome.tabs.query({ groupId: updatedTabGroup.id })
          .catch(() => {}) //Swallow
          .then(tabs => {
            tabId = tabs.sort((a, b) => String(a.index).localeCompare(String(b.index), { numeric: true }))[0].id;
          });
      }

      chrome.tabs.get(tabId)
        .catch(() => {}) //Swallow
        .then(tab => chrome.tabs.highlight({ 'tabs': tab.index }), () => {});
    }
  }).bind(null, updatedTabGroup), 250);
});