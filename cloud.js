// 玫瑰按摩 - 云端同步库（GitHub Gist）
// 读取：公开 Gist（raw 通道），任何手机零配置即可查看技师
// 写入：需 Token，在"个人中心→云端设置"里填一次（仅你自己的设备需要）
var CLOUD_GIST_OWNER = 'chenhaijun770528';
var CLOUD_DEFAULT_GIST_ID = '7f4dc05ed473a5148763b6b4d23e2c26';
var CLOUD_DEFAULT_TOKEN = '';

var Cloud = {
  gistId: '',
  token: '',
  lastStatus: '', // 'ok' | 'offline' | ''
  init: function () {
    this.gistId = Storage.get('cloud_gist', '') || CLOUD_DEFAULT_GIST_ID;
    this.token = Storage.get('cloud_token', '') || CLOUD_DEFAULT_TOKEN;
  },
  canWrite: function () { return !!(this.gistId && this.token); },
  canRead: function () { return !!this.gistId; },

  // 带超时，失败自动降级，绝不卡界面
  _fetch: function (url, opts, asText, timeoutMs, cb) {
    var done = false, self = this;
    var timer = setTimeout(function () {
      if (!done) { done = true; self.lastStatus = 'offline'; cb(null); }
    }, timeoutMs || 6000);
    fetch(url, opts)
      .then(function (r) { return asText ? r.text() : r.json(); })
      .then(function (d) {
        if (!done) { done = true; clearTimeout(timer); self.lastStatus = 'ok'; cb(d); }
      })
      .catch(function () {
        if (!done) { done = true; clearTimeout(timer); self.lastStatus = 'offline'; cb(null); }
      });
  },

  // 公开读取（raw 通道，无需 token，任何手机可查看）
  readAll: function (cb) {
    if (!this.gistId) { cb(null); return; }
    var self = this;
    var names = ['accounts.json', 'technicians.json', 'notices.json'];
    var results = {}, pending = names.length, got = false;
    names.forEach(function (nm) {
      var url = 'https://gist.githubusercontent.com/' + CLOUD_GIST_OWNER + '/' + self.gistId + '/raw/' + nm;
      self._fetch(url, {}, true, 6000, function (txt) {
        if (txt) { try { results[nm] = JSON.parse(txt); got = true; } catch (e) { results[nm] = null; } }
        pending--;
        if (pending === 0) cb(got ? results : null);
      });
    });
  },

  writeFile: function (filename, content, cb) {
    if (!this.canWrite()) { if (cb) cb(false); return; }
    var self = this, files = {}; files[filename] = { content: JSON.stringify(content) };
    this._fetch('https://api.github.com/gists/' + this.gistId,
      {
        method: 'PATCH',
        headers: { 'Authorization': 'token ' + this.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: files })
      }, false, 8000, function (d) { if (cb) cb(!!d); });
  },

  // 读取：云端优先（公开），失败/超时降级本地；回调一定触发
  load: function (key, defaultVal, cb) {
    var local = Storage.get(key, defaultVal);
    if (!this.canRead()) { cb(local); return; }
    var self = this, fname = key + '.json';
    this.readAll(function (files) {
      if (files && files[fname] !== undefined && files[fname] !== null) { Storage.set(key, files[fname]); cb(files[fname]); }
      else { cb(local); }
    });
  },

  // 保存：本地立即生效，云端后台同步（不阻塞）
  save: function (key, val, cb) {
    Storage.set(key, val);
    if (cb) cb(true);
    if (!this.canWrite()) return;
    this.writeFile(key + '.json', val, function () {});
  },

  test: function (cb) {
    if (!this.canRead()) { cb(false); return; }
    this.readAll(function (files) { cb(!!files); });
  }
};
