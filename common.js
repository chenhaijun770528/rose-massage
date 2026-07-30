// 玫瑰按摩 - 共用库（本地存储 + 工具）
var Storage = {
  get: function (key, defaultVal) {
    try {
      var v = localStorage.getItem('rose_' + key);
      return v ? JSON.parse(v) : defaultVal;
    } catch (e) { return defaultVal; }
  },
  set: function (key, val) {
    try { localStorage.setItem('rose_' + key, JSON.stringify(val)); } catch (e) {}
  }
};

function toast(msg) {
  var el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2200);
}

function genId() {
  return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

function getCurrentUser() {
  return Storage.get('user', null);
}

function setCurrentUser(u) {
  Storage.set('user', u);
}

function formatTime(ts) {
  var d = new Date(ts);
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 图片压缩：file -> base64 (jpeg)
function compressImage(file, maxW, maxH, quality, callback) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var w = img.width, h = img.height;
      if (w > maxW || h > maxH) {
        var r = Math.min(maxW / w, maxH / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function () { callback(''); };
    img.src = e.target.result;
  };
  reader.onerror = function () { callback(''); };
  reader.readAsDataURL(file);
}

// 退出登录
function logout() {
  Storage.set('user', null);
  location.href = 'index.html';
}
