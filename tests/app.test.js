const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class FakeElement {
  constructor() {
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.hidden = false;
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  dispatch(type, event = {}) { this.listeners[type]?.({ target: this, currentTarget: this, preventDefault() {}, ...event }); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() {}
  reset() {}
  reportValidity() { return true; }
}

const elements = new Map();
const getElement = (selector) => {
  if (!elements.has(selector)) elements.set(selector, new FakeElement());
  return elements.get(selector);
};
const storage = new Map();
const now = new Date();
const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const legacyPost = { id: 'legacy-1', title: '以前の投稿', genre: '理科', status: '投稿済み', script: '既存の台本', caption: '', scheduledDate: `${month}-01`, updatedAt: now.getTime() };
storage.set('boku-tiranon-posts', JSON.stringify([legacyPost]));

const context = {
  console,
  Date,
  Math,
  crypto: { randomUUID: () => 'new-1' },
  setTimeout: (callback) => callback(),
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  },
  document: {
    querySelector: getElement,
    querySelectorAll: () => [],
    createElement: () => {
      const element = new FakeElement();
      Object.defineProperty(element, 'textContent', { set(value) { this._text = String(value); this.innerHTML = this._text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }, get() { return this._text || ''; } });
      return element;
    },
  },
};
context.globalThis = context;

vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), context, { filename: 'app.js' });

assert.match(getElement('#postList').innerHTML, /以前の投稿/);
assert.match(getElement('#postList').innerHTML, /リール/, '既存データには互換用の投稿形式が表示される');
assert.equal(getElement('#goalProgressText').textContent, '今月 1 / 10 投稿');

Object.assign(getElement('#title'), { value: '新しいリール' });
Object.assign(getElement('#genre'), { value: 'その他' });
Object.assign(getElement('#status'), { value: '投稿済み' });
Object.assign(getElement('#postFormat'), { value: 'リール' });
Object.assign(getElement('#script'), { value: 'テスト台本' });
Object.assign(getElement('#caption'), { value: 'テスト投稿' });
Object.assign(getElement('#scheduledDate'), { value: `${month}-02` });
Object.assign(getElement('#views'), { value: '1200' });
Object.assign(getElement('#likes'), { value: '80' });
Object.assign(getElement('#saves'), { value: '25' });
getElement('#postForm').dispatch('submit');

const saved = JSON.parse(storage.get('boku-tiranon-posts'));
assert.equal(saved.length, 2);
assert.equal(saved.find((post) => post.id === 'legacy-1').script, '既存の台本', '既存データを保持する');
assert.deepEqual(
  { format: saved[0].postFormat, views: saved[0].views, likes: saved[0].likes, saves: saved[0].saves },
  { format: 'リール', views: 1200, likes: 80, saves: 25 },
);
assert.equal(getElement('#topViewsTitle').textContent, '新しいリール');
assert.equal(getElement('#averageViews').textContent, '1,200 回');
assert.equal(getElement('#goalProgressText').textContent, '今月 2 / 10 投稿');

getElement('#monthlyGoal').value = '12';
getElement('#monthlyGoal').dispatch('change');
assert.equal(storage.get('boku-tiranon-monthly-goal'), '12');
assert.equal(getElement('#goalProgressText').textContent, '今月 2 / 12 投稿');

console.log('app tests passed');
