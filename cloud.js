// cloud.js - 本地优先存储 + Gist 云同步
// 所有数据优先读写 localStorage（rose_ 前缀），同一网站下所有页面互通
// 若配置了 GitHub Token，数据后台同步到 Gist（多设备共享）
var Cloud = {
  _gistId: '',
  _token: '',
  _initDone: false,

  init: function () {
    if (this._initDone) return;
    this._initDone = true;
    this._gistId = Storage.get('cloud_gist', '7f4dc05ed473a5148763b6b4d23e2c26') || '7f4dc05ed473a5148763b6b4d23e2c26';
    this._token = Storage.get('cloud_token', '') || '';
  },

  // localStorage 直读（永远成功，零配置）
  load: function (key, def, cb) {
    this.init();
    var data = Storage.get(key, def);
    // 异步模拟（给 UI 渲染留时间）
    setTimeout(function () { cb(data); }, 0);
  },

  // localStorage 直写（永远成功，零配置）
  save: function (key, data, cb) {
    this.init();
    Storage.set(key, data);
    if (cb) setTimeout(function () { cb(); }, 0);
    // 后台云同步（有 Token 才发请求，不阻塞）
    this._asyncPush(key, data);
  },

  // 云端是否存在数据（未配置 Token 时返回 false）
  enabled: function () {
    this.init();
    return !!(this._gistId && this._token);
  },

  test: function (cb) {
    this.init();
    if (!this.enabled()) { cb(false); return; }
    var self = this;
    var timer = setTimeout(function () { cb(false); }, 6000);
    fetch('https://api.github.com/gists/' + this._gistId, {
      headers: { 'Authorization': 'token ' + this._token, 'User-Agent': 'node' }
    }).then(function (r) { return r.json(); })
      .then(function (d) { clearTimeout(timer); cb(!!d.files); })
      .catch(function () { clearTimeout(timer); cb(false); });
  },

  // 后台异步推送到 Gist（不阻塞 UI）
  _asyncPush: function (key, data) {
    if (!this.enabled()) return;
    var self = this;
    setTimeout(function () {
      self._pushToGist(key, data, function () {});
    }, 100);
  },

  _pushToGist: function (key, data, cb) {
    var self = this;
    var url = 'https://api.github.com/gists/' + this._gistId;
    var timer = setTimeout(function () { cb(false); }, 8000);
    fetch(url, {
      method: 'GET',
      headers: { 'Authorization': 'token ' + this._token, 'User-Agent': 'node' }
    }).then(function (r) { return r.json(); })
      .then(function (gist) {
        var filename = key + '.json';
        var files = {};
        files[filename] = { content: JSON.stringify(data) };
        // 保留其他文件
        if (gist.files) {
          Object.keys(gist.files).forEach(function (f) {
            if (f !== filename && gist.files[f].content !== undefined) {
              files[f] = { content: gist.files[f].content };
            }
          });
        }
        fetch(url, {
          method: 'PATCH',
          headers: { 'Authorization': 'token ' + self._token, 'User-Agent': 'node', 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: files })
        }).then(function () { clearTimeout(timer); cb(true); })
          .catch(function () { clearTimeout(timer); cb(false); });
      })
      .catch(function () { clearTimeout(timer); cb(false); });
  }
};
