const STORAGE_KEY = 'boku-tiranon-posts';
const GOAL_STORAGE_KEY = 'boku-tiranon-monthly-goal';
const DEFAULT_GOAL = 10;
const POST_FORMATS = ['リール', '画像投稿', 'ストーリーズ'];
const $ = (selector) => document.querySelector(selector);
const postList = $('#postList');
const emptyState = $('#emptyState');
const postDialog = $('#postDialog');
const deleteDialog = $('#deleteDialog');
let posts = loadPosts();
let activeFilter = 'すべて';
let deleteTargetId = null;
let monthlyGoal = loadMonthlyGoal();

function loadPosts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function savePosts() { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); }
function loadMonthlyGoal() {
  const saved = Number.parseInt(localStorage.getItem(GOAL_STORAGE_KEY), 10);
  return Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_GOAL;
}
function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `post-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function escapeHtml(value = '') { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function formatDate(value) { if (!value) return '予定日 未設定'; const [y,m,d] = value.split('-'); return `${y}.${m}.${d} 投稿予定`; }
function statusClass(status) { return status === '投稿済み' ? 'status-posted' : status === '作成中' ? 'status-making' : 'status-idea'; }
function numberOrNull(value) { return value === '' || value === null || value === undefined ? null : Math.max(0, Number.parseInt(value, 10) || 0); }
function displayNumber(value) { return value === null || value === undefined ? '—' : Number(value).toLocaleString('ja-JP'); }
function postMonth(post) {
  if (post.scheduledDate) return post.scheduledDate.slice(0, 7);
  if (post.updatedAt) { const date = new Date(post.updatedAt); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
  return '';
}
function currentMonthKey() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; }

function renderGoal() {
  const achieved = posts.filter((post) => post.status === '投稿済み' && postMonth(post) === currentMonthKey()).length;
  const percent = Math.min(100, Math.round((achieved / monthlyGoal) * 100));
  $('#monthlyGoal').value = monthlyGoal;
  $('#goalProgressText').textContent = `今月 ${achieved} / ${monthlyGoal} 投稿`;
  $('#goalPercent').textContent = `${percent}%`;
  $('#goalProgressBar').style.width = `${percent}%`;
  const progress = document.querySelector('.progress-track');
  progress.setAttribute('aria-valuemax', monthlyGoal);
  progress.setAttribute('aria-valuenow', achieved);
}

function renderAnalytics() {
  const published = posts.filter((post) => post.status === '投稿済み');
  const withViews = published.filter((post) => numberOrNull(post.views) !== null);
  const withSaves = published.filter((post) => numberOrNull(post.saves) !== null);
  const topViews = withViews.reduce((best, post) => !best || numberOrNull(post.views) > numberOrNull(best.views) ? post : best, null);
  const topSaves = withSaves.reduce((best, post) => !best || numberOrNull(post.saves) > numberOrNull(best.saves) ? post : best, null);
  $('#topViewsTitle').textContent = topViews?.title || 'データなし';
  $('#topViewsValue').textContent = topViews ? `${displayNumber(topViews.views)} 回` : '—';
  $('#topSavesTitle').textContent = topSaves?.title || 'データなし';
  $('#topSavesValue').textContent = topSaves ? `${displayNumber(topSaves.saves)} 保存` : '—';
  const average = withViews.length ? Math.round(withViews.reduce((sum, post) => sum + numberOrNull(post.views), 0) / withViews.length) : null;
  $('#averageViews').textContent = average === null ? '—' : `${displayNumber(average)} 回`;
  $('#formatAverages').innerHTML = POST_FORMATS.map((format) => {
    const matching = withViews.filter((post) => (post.postFormat || 'リール') === format);
    const value = matching.length ? Math.round(matching.reduce((sum, post) => sum + numberOrNull(post.views), 0) / matching.length) : null;
    return `<div class="format-average-item"><span>${format}</span><strong>${value === null ? '—' : `${displayNumber(value)} 回`}</strong></div>`;
  }).join('');
  $('#analyticsEmpty').hidden = withViews.length > 0 || withSaves.length > 0;
}

function render() {
  const query = $('#searchInput').value.trim().toLowerCase();
  const shown = posts.filter((post) => (activeFilter === 'すべて' || post.status === activeFilter) && [post.title, post.script, post.caption].join(' ').toLowerCase().includes(query));
  $('#postedCount').textContent = posts.filter((post) => post.status === '投稿済み').length;
  $('#allCount').textContent = posts.length;
  $('#resultCount').textContent = `${shown.length}件`;
  postList.innerHTML = shown.map((post) => `<article class="post-card">
    <div class="card-top"><span class="badge ${statusClass(post.status)}">${escapeHtml(post.status)}</span><span class="genre">${escapeHtml(post.genre)}</span></div>
    <h3>${escapeHtml(post.title)}</h3><p class="excerpt">${escapeHtml(post.script || post.caption || '台本やキャプションはまだありません。')}</p><span class="format-badge">▣ ${escapeHtml(post.postFormat || 'リール')}</span>
    <div class="card-bottom"><span class="date">📅 ${formatDate(post.scheduledDate)}</span><div class="card-actions">
      <button type="button" data-edit="${post.id}" aria-label="${escapeHtml(post.title)}を編集">✎</button><button type="button" class="delete" data-delete="${post.id}" aria-label="${escapeHtml(post.title)}を削除">⌫</button>
    </div></div></article>`).join('');
  emptyState.hidden = shown.length !== 0;
  postList.hidden = shown.length === 0;
  const isFiltered = activeFilter !== 'すべて' || query;
  $('#emptyTitle').textContent = isFiltered ? '該当する投稿がありません' : 'まだアイデアがありません';
  $('#emptyText').textContent = isFiltered ? '検索キーワードや絞り込みを変えてみてください。' : '「新しいアイデア」から、最初の投稿を登録してみよう！';
  $('#emptyAddButton').hidden = Boolean(isFiltered);
  renderGoal();
  renderAnalytics();
}
function openForm(post = null) {
  $('#postForm').reset(); $('#postId').value = post?.id || '';
  $('#dialogTitle').textContent = post ? '投稿を編集' : '新しいアイデア';
  if (post) {
    ['title','genre','status','script','caption','scheduledDate'].forEach((key) => $(`#${key}`).value = post[key] || '');
    $('#postFormat').value = post.postFormat || 'リール';
    ['views','likes','saves'].forEach((key) => $(`#${key}`).value = post[key] ?? '');
  }
  togglePerformanceFields();
  postDialog.showModal(); setTimeout(() => $('#title').focus(), 50);
}
function closeForm() { postDialog.close(); }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }
function togglePerformanceFields() { $('#performanceFields').hidden = $('#status').value !== '投稿済み'; }

$('#postForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const id = $('#postId').value;
  const existing = posts.find((post) => post.id === id);
  const data = { ...existing, id: id || createId(), title: $('#title').value.trim(), genre: $('#genre').value, status: $('#status').value, postFormat: $('#postFormat').value, script: $('#script').value.trim(), caption: $('#caption').value.trim(), scheduledDate: $('#scheduledDate').value, views: numberOrNull($('#views').value), likes: numberOrNull($('#likes').value), saves: numberOrNull($('#saves').value), updatedAt: Date.now() };
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
$('#status').addEventListener('change', togglePerformanceFields);
$('#monthlyGoal').addEventListener('change', (event) => { monthlyGoal = Math.min(999, Math.max(1, Number.parseInt(event.target.value, 10) || DEFAULT_GOAL)); localStorage.setItem(GOAL_STORAGE_KEY, monthlyGoal); renderGoal(); toast('今月の目標を保存しました'); });
$('#filterTabs').addEventListener('click', (event) => { if (!event.target.dataset.filter) return; activeFilter = event.target.dataset.filter; document.querySelectorAll('#filterTabs button').forEach((button) => button.classList.toggle('active', button === event.target)); render(); });
postDialog.addEventListener('click', (event) => { if (event.target === postDialog) closeForm(); });
render();
