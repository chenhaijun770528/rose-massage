// 玫瑰按摩 - 云端同步库（GitHub Gist）
// 默认留空，可在下方填写，也可在"云端设置"页运行时配置。
var CLOUD_DEFAULT_GIST_ID = '';   // 例如: 'ed0e2614049e613d382f94458d9022f1'
var CLOUD_DEFAULT_TOKEN = '';     // 仅 gist 权限的 Token

var Cloud = {
  gistId: '',
  token: '',
  init: function () {
    this.gistId = Storage.get('cloud_gist', '') || CLOUD_DEFAULT_GIST_ID;
    this.token = Storage.get('cloud_token', '') || CLOUD_DEFAULT_TOKEN;
  },
  enabled: function () {
    return !!(this.gistId && this.token);
  },
  // 读取整个 Gist（返回 {文件名: 解析后的内容}）
  readAll: function (callback) {
    if (!this.gistId) { callback(null); return; }
    fetch('https://api.github.com/gists/' + this.gistId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var files = {};
        if (data && data.files) {
          for (var k in data.files) {
            try { files[k] = JSON.parse(data.files[k].content); }
            catch (e) { files[k] = data.files[k].content; }
          }
        }
        callback(files);
      })
      .catch(function (e) { callback(null); });
  },
  // 写入单个文件（覆盖式）
  writeFile: function (filename, content, callback) {
    if (!this.enabled()) { if (callback) callback(false); return; }
    var files = {};
    files[filename] = { content: JSON.stringify(content) };
    fetch('https://api.github.com/gists/' + this.gistId, {
      method: 'PATCH',
      headers: {
        'Authorization': 'token ' + this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ files: files })
    })
      .then(function (r) { return r.ok; })
      .then(function (ok) { if (callback) callback(ok); })
      .catch(function (e) { if (callback) callback(false); });
  },
  // 读取本地优先，云端合并（云端有则用云端）
  load: function (key, defaultVal, callback) {
    var local = Storage.get(key, defaultVal);
    if (!this.enabled()) { callback(local); return; }
    var fname = key + '.json';
    this.readAll(function (files) {
      if (files && files[fname] !== undefined) {
        Storage.set(key, files[fname]);
        callback(files[fname]);
      } else {
        callback(local);
      }
    });
  },
  // 保存：写本地 + 写云端
  save: function (key, val, callback) {
    Storage.set(key, val);
    if (!this.enabled()) { if (callback) callback(true); return; }
    this.writeFile(key + '.json', val, function (ok) { if (callback) callback(ok); });
  }
};
