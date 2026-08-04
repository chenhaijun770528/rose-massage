// cloud.js - GitHub Gist 云端存储
// 所有设备共享同一个 Gist，Token 内嵌，写入后全设备可见
var CLOUD_GIST_ID = '7f4dc05ed473a5148763b6b4d23e2c26';
var CLOUD_TOKEN = Storage.get('cloud_token', '') || '';

var Cloud = {
  _cache: {},      // 内存缓存，减少网络请求
  _writeTimer: null, // 防抖写

  // 初始化
  init: function () {},

  // 检查云端是否可用
  enabled: function () {
    return !!(CLOUD_GIST_ID && CLOUD_TOKEN);
  },

  // 测试连接
  test: function (cb) {
    if (!this.enabled()) { cb(false); return; }
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; cb(false); } }, 8000);
    fetch('https://api.github.com/gists/' + CLOUD_GIST_ID, {
      headers: { 'Authorization': 'token ' + CLOUD_TOKEN, 'User-Agent': 'node' }
    }).then(function (r) { return r.json(); })
      .then(function (d) { if (!done) { done = true; clearTimeout(timer); cb(!!d.files); } })
      .catch(function () { if (!done) { done = true; clearTimeout(timer); cb(false); } });
  },

  // 读取云端所有文件（一次请求拿到全部）
  _readAllGist: function (cb) {
    if (!this.enabled()) { cb(null); return; }
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; cb(null); } }, 8000);
    var self = this;
    fetch('https://api.github.com/gists/' + CLOUD_GIST_ID, {
      headers: { 'Authorization': 'token ' + CLOUD_TOKEN, 'User-Agent': 'node' }
    }).then(function (r) { return r.json(); })
      .then(function (gist) {
        if (!done) {
          done = true;
          clearTimeout(timer);
          if (!gist.files) { cb(null); return; }
          var files = {};
          Object.keys(gist.files).forEach(function (name) {
            if (gist.files[name].content !== undefined) {
              var match = name.match(/^(.+)\.json$/);
              var key = match ? match[1] : name;
              try { files[key] = JSON.parse(gist.files[name].content); }
              catch (e) { files[key] = gist.files[name].content; }
            }
          });
          self._cache = files;
          cb(files);
        }
      })
      .catch(function () { if (!done) { done = true; clearTimeout(timer); cb(null); } });
  },

  // 读取指定 key 的数据（先查缓存，再从 gist 加载）
  load: function (key, def, cb) {
    var self = this;
    // 命中缓存直接返回
    if (this._cache[key] !== undefined) {
      setTimeout(function () { cb(self._cache[key]); }, 0);
      return;
    }
    // 未命中，从 gist 加载
    this._readAllGist(function (files) {
      if (files && files[key] !== undefined) {
        setTimeout(function () { cb(files[key]); }, 0);
      } else {
        setTimeout(function () { cb(def !== undefined ? def : null); }, 0);
      }
    });
  },

  // 保存指定 key 的数据到云端（防抖 500ms，避免高频写入触发 409）
  save: function (key, data, cb) {
    var self = this;
    // 立即更新缓存
    this._cache[key] = data;
    // 防抖：延迟写入
    if (this._writeTimer) clearTimeout(this._writeTimer);
    this._writeTimer = setTimeout(function () {
      self._writeAllGist(function (ok) { if (cb) cb(ok); });
    }, 500);
  },

  // 强制立即写入（用于登录/注册等关键操作）
  saveNow: function (key, data, cb) {
    if (this._writeTimer) clearTimeout(this._writeTimer);
    this._cache[key] = data;
    this._writeAllGist(cb);
  },

  // 全量写入 Gist（GET → 修改 → PATCH）
  _writeAllGist: function (cb) {
    var self = this;
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; if (cb) cb(false); } }, 12000);

    // 读取现有 gist
    fetch('https://api.github.com/gists/' + CLOUD_GIST_ID, {
      headers: { 'Authorization': 'token ' + CLOUD_TOKEN, 'User-Agent': 'node' }
    }).then(function (r) { return r.json(); })
      .then(function (gist) {
        var files = {};
        // 保留其他文件
        if (gist.files) {
          Object.keys(gist.files).forEach(function (f) {
            if (gist.files[f].content !== undefined && gist.files[f].truncated !== true) {
              files[f] = { content: gist.files[f].content };
            }
          });
        }
        // 更新/新增当前缓存的数据
        var keys = Object.keys(self._cache);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          var v = self._cache[k];
          var filename = k + '.json';
          files[filename] = { content: JSON.stringify(v) };
        }

        fetch('https://api.github.com/gists/' + CLOUD_GIST_ID, {
          method: 'PATCH',
          headers: { 'Authorization': 'token ' + CLOUD_TOKEN, 'User-Agent': 'node', 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: files })
        }).then(function (r) { return r.json(); })
          .then(function (result) {
            if (!done) {
              done = true;
              clearTimeout(timer);
              if (cb) cb(!!result.id);
            }
          })
          .catch(function () { if (!done) { done = true; clearTimeout(timer); if (cb) cb(false); } });
      })
      .catch(function () { if (!done) { done = true; clearTimeout(timer); if (cb) cb(false); } });
  }
};
