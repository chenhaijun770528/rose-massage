// common.js - 本地存储 + 工具函数
// 所有页面共享，Storage = localStorage 前缀隔离
var Storage = {
  prefix: 'rose_',
  get: function (k, def) {
    var v = localStorage.getItem(this.prefix + k);
    if (v === null && def !== undefined) return def;
    try { return JSON.parse(v); } catch (e) { return v; }
  },
  set: function (k, v) {
    localStorage.setItem(this.prefix + k, typeof v === 'string' ? v : JSON.stringify(v));
  },
  del: function (k) { localStorage.removeItem(this.prefix + k); }
};

function genId() {
  return 'uid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function toast(msg) {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.8);color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;z-index:99999;white-space:nowrap;';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(function () { el.remove(); }, 400); }, 1800);
}

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function getCurrentUser() {
  try {
    var u = Storage.get('current_user');
    return u || null;
  } catch (e) { return null; }
}

function setCurrentUser(user) {
  Storage.set('current_user', user);
}

function logout() {
  Storage.del('current_user');
  location.href = 'login.html';
}

// 图片压缩：文件 → Base64
function compressImage(file, maxW, maxH, quality, cb) {
  var fr = new FileReader();
  fr.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var w = img.width, h = img.height;
      if (w > maxW || h > maxH) {
        var r = Math.min(maxW / w, maxH / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      cb(cv.toDataURL('image/jpeg', quality));
    };
    img.onerror = function () { cb(null); };
    img.src = e.target.result;
  };
  fr.onerror = function () { cb(null); };
  fr.readAsDataURL(file);
}
