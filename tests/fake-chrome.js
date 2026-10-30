// Um chrome.* mínimo, em memória, para testar o background no Node.

function event() {
  const listeners = [];
  return {
    listeners,
    addListener: (fn) => listeners.push(fn),
    fire: (...args) => Promise.all(listeners.map((fn) => fn(...args))),
  };
}

function storageArea() {
  let items = {};
  const keysOf = (keys) => (keys == null ? Object.keys(items) : [].concat(keys));
  return {
    get items() { return items; },
    async get(keys) {
      const out = {};
      for (const key of keysOf(keys)) {
        if (key in items) out[key] = structuredClone(items[key]);
      }
      return out;
    },
    async set(values) {
      const changes = {};
      for (const [key, value] of Object.entries(values)) {
        changes[key] = { oldValue: items[key], newValue: value };
        items[key] = structuredClone(value);
      }
      return changes;
    },
    async remove(keys) {
      for (const key of [].concat(keys)) delete items[key];
    },
    clear() { items = {}; },
  };
}

export function createFakeChrome() {
  const local = storageArea();
  const session = storageArea();
  const onChanged = event();

  const wrap = (area, name) => ({
    get: area.get,
    remove: area.remove,
    async set(values) {
      const changes = await area.set(values);
      await onChanged.fire(changes, name);
    },
  });

  const env = {
    focused: true,
    idleState: 'active',
    tabs: [{ id: 1, windowId: 1, active: true, url: 'https://www.youtube.com/watch?v=abc', audible: false }],
    alarms: new Map(),
    notifications: [],
    badges: new Map(),
  };

  const chrome = {
    env,
    storage: {
      local: { ...wrap(local, 'local'), items: () => local.items },
      session: { ...wrap(session, 'session'), items: () => session.items },
      onChanged,
    },
    runtime: {
      getURL: (path) => `chrome-extension://test/${path}`,
      onMessage: event(),
      openOptionsPage: async () => {},
    },
    action: {
      async setBadgeText({ tabId, text }) { env.badges.set(tabId, { ...env.badges.get(tabId), text }); },
      async setBadgeBackgroundColor({ tabId, color }) { env.badges.set(tabId, { ...env.badges.get(tabId), color }); },
      async setBadgeTextColor() {},
    },
    windows: {
      WINDOW_ID_NONE: -1,
      async getLastFocused() { return { id: 1, focused: env.focused }; },
      onFocusChanged: event(),
    },
    tabs: {
      async query({ active, windowId }) {
        return env.tabs.filter((t) => (active === undefined || t.active === active)
          && (windowId === undefined || t.windowId === windowId)).map((t) => ({ ...t }));
      },
      async update(id, props) {
        const tab = env.tabs.find((t) => t.id === id);
        Object.assign(tab, props);
        return { ...tab };
      },
      async create(props) { env.created = props; return { id: 99, ...props }; },
      onActivated: event(),
      onRemoved: event(),
      onUpdated: event(),
    },
    idle: {
      async queryState() { return env.idleState; },
      setDetectionInterval() {},
      onStateChanged: event(),
    },
    alarms: {
      async create(name, info) { env.alarms.set(name, { name, ...info }); },
      async get(name) { return env.alarms.get(name); },
      async clear(name) { return env.alarms.delete(name); },
      onAlarm: event(),
    },
    notifications: {
      create(id, options) { env.notifications.push({ id, ...options }); },
      clear() {},
      onClicked: event(),
    },
  };

  // Envia uma mensagem como uma página da extensão faria.
  chrome.send = (message) => new Promise((resolve) => {
    for (const fn of chrome.runtime.onMessage.listeners) fn(message, {}, resolve);
  });

  return chrome;
}
