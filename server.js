var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

// 模板缓存
var cache = {};
var VIEW_FOLOER = './public';

var preComplie = function (str) {
  var replaced = str.replace(/<%\s+(include.*)\s+%>/g, function(match, code){
    var partial = code.split(/\s/)[1];
    if(!cache[partial]){
      cache[partial] = fs.readFileSync(path.join(VIEW_FOLOER, partial),'utf8')
    }
    return cache[partial]
  })

  if(str.match(/<%\s+(include.*)\s+%>/)){
    return preComplie(replaced);
  } else {
    return replaced;
  }
}

var complie = function (str) { 
  str = preComplie(str);
  var tpl = str.replace(/\n/g,'\\n')
  .replace(/<%=([\s\S]+?)%>/g, function(match, code){
    return "' + escape(" + code + ") +'"
  }).replace(/<%-([\s\S]+?)%>/g, function(match, code){
    return "' + " + code + " +'"
  }).replace(/<%([\s\S]+?)%>/g, function(match, code){
    return "';\n" + code + "\ntpl +='"
  })
  tpl = "tpl = '" + tpl + "'";
  tpl=tpl.replace(/''/g,'\'\\n\'')
  tpl ="var tpl = '';\nwith(obj){" + tpl + "}\nreturn tpl;";
  console.log(tpl)
  return new Function('obj', 'escape', tpl)
}

// 字符转义
var escape = function(html){
  return String(html)
    .replace(/&(?!\w+;)/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;')
}

// var render = function(complied, data){
//   return complied(data, escape)
// }

// layout render

var renderLayout = function(str, viewname){
  return str.replace(/<%-\s*body\s*%>/g,function(match, code){
    if(!cache[viewname]){
      cache[viewname] = fs.readFileSync(path.join(VIEW_FOLOER, viewname), 'utf8');
    }
    return cache[viewname];
  })
}

// 编译模板


http.createServer(function(req, res){
  res.render = function(viewname, data){
    var layout = data.layout;
    if(layout){
      if(!cache[layout]){
        try {
          cache[layout] = fs.readFileSync(path.join(VIEW_FOLOER,layout),'utf-8');
        } catch (error) {
          res.writeHead(500,{'Content-Type':'text/html; charset=utf-8;'})
          res.end('布局文件错误')
          return;
        }
      }
    }

    var layoutContent = cache[layout] || '<%-body%>';

    var replaced;

    try{
      replaced = renderLayout(layoutContent, viewname);
    } catch(e){
      res.writeHead(500,{'Content-Type':'text/html; charset=utf-8;'})
      res.end('模板文件错误')
      return;
    }
   
    var key = viewname + ':' + (layout || '');
    if(!cache[key]){
      cache[key] = complie(replaced);
    }
    var html = cache[key](data, escape);
    res.setHeader('Content-Type','text/html; charset=utf-8;');
    res.writeHead(200);
    res.end(html);
  }
  if(url.parse(req.url).pathname === '/v2'){
    var count = 0;
    if(!cache['v2.html']){
      try{
        const file = fs.readFileSync(path.join(VIEW_FOLOER, 'v2.html'), 'utf8');
        cache['v2.html'] = complie(file);
      } catch (error) {
        console.log(error)
        res.writeHead(500,{'Content-Type':'text/html; charset=utf-8;'})
        res.end('模板文件错误')
        return;
      }
    }
    var html = cache['v2.html']({user:'',articles:''}, escape);
    res.setHeader('Content-Type','text/html; charset=utf-8;');
    res.writeHead(200);
    res.write(html);
    setTimeout(function(){ 
      res.write(' <script>bigpipe.set("user","joi");</script>')},2000);
      count++;
      if(count === 2){
        res.end()
      }
    setTimeout(function(){
      res.write(' <script>bigpipe.set("articles","mememme");</script>');
      count++;
      if(count === 2){
        res.end()
      }
    },5000)
  }else if(url.parse(req.url).pathname === '/index'){
    res.render('index.html',{
      layout:'layout.html',
      username:'lalala',
      test: 'hello templet',
      script:'<script>alert("I am XSS.")</script>',
      item:[{name:'joi'},{name:'joke'}]
    })
  }
}).listen(4000);
console.log('http://localhost:4000')