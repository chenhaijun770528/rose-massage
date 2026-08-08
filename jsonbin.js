// jsonbin.js - 云端同步库（JSONBin.io，国内完全可达）
var JB={
  masterKey:'$2a$10$Jp5qaeJY5pMYvvFKg4O/1uKEIpZqkY1xzpUx8BWfPLrOy9HtsXRS2',
  bins:{
    accounts:'6a65e881da38895dfe9179f4',
    technicians:'6a65e8d0da38895dfe917af6',
    notices:'6a65e8ffda38895dfe917bd0',
    audit_log:'6a65e932f5f4af5e29c2f289'
  },
  _cache:{},
  _initDone:false,
  _get:function(binId,cb){
    var h=new XMLHttpRequest();
    h.open('GET','https://api.jsonbin.io/v3/b/'+binId+'/latest',true);
    h.onload=function(){if(h.status===200){try{var j=JSON.parse(h.responseText);cb(j.record);return;}catch(e){}}cb(null);};
    h.onerror=function(){cb(null);};
    h.send();
  },
  _put:function(binId,data,cb){
    var body=JSON.stringify(data);
    var h=new XMLHttpRequest();
    h.open('PUT','https://api.jsonbin.io/v3/b/'+binId,true);
    h.setRequestHeader('Content-Type','application/json');
    h.setRequestHeader('X-Master-Key',this.masterKey);
    h.onload=function(){if(cb)try{cb(h.status===200||h.status===201);}catch(e){try{cb(false);}catch(e){}}};
    h.onerror=function(){if(cb)try{cb(false);}catch(e){}};
    h.send(body);
  },
  init:function(){
    if(this._initDone)return;
    this._initDone=true;
    var s=this,b=this.bins;
    this._get(b.accounts,function(v){s._cache.accounts=v||[];localStorage.setItem('rose_accounts',JSON.stringify(s._cache.accounts));});
    this._get(b.technicians,function(v){s._cache.technicians=v||[];localStorage.setItem('rose_technicians',JSON.stringify(s._cache.technicians));});
    this._get(b.notices,function(v){s._cache.notices=v||[];localStorage.setItem('rose_notices',JSON.stringify(s._cache.notices));});
    this._get(b.audit_log,function(v){s._cache.audit_log=v||[];localStorage.setItem('rose_audit_log',JSON.stringify(s._cache.audit_log));});
  },
  load:function(key,def,cb){
    var s=this,binId=this.bins[key];
    if(binId){
      this._get(binId,function(v){
        if(v!==null){
          s._cache[key]=v;
          localStorage.setItem('rose_'+key,JSON.stringify(v));
          setTimeout(function(){try{cb(v);}catch(e){try{cb(def);}catch(e){}}},0);
        }else{
          var lv=localStorage.getItem('rose_'+key);
          v=lv?JSON.parse(lv):def;
          s._cache[key]=v;
          setTimeout(function(){try{cb(v);}catch(e){try{cb(def);}catch(e){}}},0);
        }
      });
    }else{
      var lv=localStorage.getItem('rose_'+key);
      var v=lv?JSON.parse(lv):def;
      this._cache[key]=v;
      setTimeout(function(){try{cb(v);}catch(e){try{cb(def);}catch(e){}}},0);
    }
  },
  save:function(key,data,cb){
    localStorage.setItem('rose_'+key,JSON.stringify(data));
    this._cache[key]=data;
    var binId=this.bins[key];
    if(binId){
      this._put(binId,data,function(ok){
        if(cb)setTimeout(function(){try{cb(ok);}catch(e){try{cb(false);}catch(e){}}},0);
      });
    }else{
      if(cb)setTimeout(function(){try{cb(true);}catch(e){try{cb(false);}catch(e){}}},0);
    }
  }
};
JB.init();
