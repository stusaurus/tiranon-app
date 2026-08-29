const STORAGE_KEY = 'boku-tiranon-posts';
const $ = (selector) => document.querySelector(selector);
const postList = $('#postList');
const emptyState = $('#emptyState');
const postDialog = $('#postDialog');
const deleteDialog = $('#deleteDialog');
let posts = loadPosts();
let activeFilter = 'すべて';
let deleteTargetId = null;

function loadPosts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function savePosts() { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); }
function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `post-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function escapeHtml(value = '') { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function formatDate(value) { if (!value) return '予定日 未設定'; const [y,m,d] = value.split('-'); return `${y}.${m}.${d} 投稿予定`; }
function statusClass(status) { return status === '投稿済み' ? 'status-posted' : status === '作成中' ? 'status-making' : 'status-idea'; }

function render() {
  const query = $('#searchInput').value.trim().toLowerCase();
  const shown = posts.filter((post) => (activeFilter === 'すべて' || post.status === activeFilter) && [post.title, post.script, post.caption].join(' ').toLowerCase().includes(query));
  $('#postedCount').textContent = posts.filter((post) => post.status === '投稿済み').length;
  $('#allCount').textContent = posts.length;
  $('#resultCount').textContent = `${shown.length}件`;
  postList.innerHTML = shown.map((post) => `<article class="post-card">
    <div class="card-top"><span class="badge ${statusClass(post.status)}">${escapeHtml(post.status)}</span><span class="genre">${escapeHtml(post.genre)}</span></div>
    <h3>${escapeHtml(post.title)}</h3><p class="excerpt">${escapeHtml(post.script || post.caption || '台本やキャプションはまだありません。')}</p>
    <div class="card-bottom"><span class="date">📅 ${formatDate(post.scheduledDate)}</span><div class="card-actions">
      <button type="button" data-edit="${post.id}" aria-label="${escapeHtml(post.title)}を編集">✎</button><button type="button" class="delete" data-delete="${post.id}" aria-label="${escapeHtml(post.title)}を削除">⌫</button>
    </div></div></article>`).join('');
  emptyState.hidden = shown.length !== 0;
  postList.hidden = shown.length === 0;
  const isFiltered = activeFilter !== 'すべて' || query;
  $('#emptyTitle').textContent = isFiltered ? '該当する投稿がありません' : 'まだアイデアがありません';
  $('#emptyText').textContent = isFiltered ? '検索キーワードや絞り込みを変えてみてください。' : '「新しいアイデア」から、最初の投稿を登録してみよう！';
  $('#emptyAddButton').hidden = Boolean(isFiltered);
}
function openForm(post = null) {
  $('#postForm').reset(); $('#postId').value = post?.id || '';
  $('#dialogTitle').textContent = post ? '投稿を編集' : '新しいアイデア';
  if (post) ['title','genre','status','script','caption','scheduledDate'].forEach((key) => $(`#${key}`).value = post[key] || '');
  postDialog.showModal(); setTimeout(() => $('#title').focus(), 50);
}
function closeForm() { postDialog.close(); }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }

$('#postForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const id = $('#postId').value;
  const data = { id: id || createId(), title: $('#title').value.trim(), genre: $('#genre').value, status: $('#status').value, script: $('#script').value.trim(), caption: $('#caption').value.trim(), scheduledDate: $('#scheduledDate').value, updatedAt: Date.now() };
  posts = id ? posts.map((post) => post.id === id ? data : post) : [data, ...posts];
  savePosts(); render(); closeForm(); toast(id ? '投稿を更新しました' : 'アイデアを追加しました');
});
postList.addEventListener('click', (event) => {
  const editId = event.target.dataset.edit; const removeId = event.target.dataset.delete;
  if (editId) openForm(posts.find((post) => post.id === editId));
  if (removeId) { deleteTargetId = removeId; deleteDialog.showModal(); }
});
$('#confirmDelete').addEventListener('click', () => { posts = posts.filter((post) => post.id !== deleteTargetId); savePosts(); render(); deleteDialog.close(); toast('投稿を削除しました'); });
$('#cancelDelete').addEventListener('click', () => deleteDialog.close());
$('#openFormButton').addEventListener('click', () => openForm());
$('#emptyAddButton').addEventListener('click', () => openForm());
$('#closeDialogButton').addEventListener('click', closeForm);
$('#cancelButton').addEventListener('click', closeForm);
$('#searchInput').addEventListener('input', render);
$('#filterTabs').addEventListener('click', (event) => { if (!event.target.dataset.filter) return; activeFilter = event.target.dataset.filter; document.querySelectorAll('#filterTabs button').forEach((button) => button.classList.toggle('active', button === event.target)); render(); });
postDialog.addEventListener('click', (event) => { if (event.target === postDialog) closeForm(); });
render();
