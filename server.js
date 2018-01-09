const timeStamp = require('./serverUtility/time.js').timeStamp;
const http = require('http');
const WebApp = require('./webapp');
const fs = require('fs');
const CommentHandler = require('./serverUtility/commentHandler.js');
const PORT = 5000;

let registeredUsers = ['joy','arvind'];
let session = {};
let commentHandler = new CommentHandler('./data/comments.json');
commentHandler.loadComments();


/*============================================================================*/
const logger = function(req,res) {
  let logs = ['--------------------------------------------------------------',
    `${timeStamp()}`,
    `${req.method}`,
    `${req.url}`,
    `${JSON.stringify(req.headers,null,2)}`,
    ''
  ].join('\n');
  console.log(`${req.method}    ${req.url}`);
  req.fs.appendFile('./data/log.json',logs,()=>{});
}

const getContentType = function(filePath) {
  let fileExtension = filePath.slice(filePath.lastIndexOf('.'));
  let contentTypes = {
      '.html':'text/html',
      '.css':'text/css',
      '.js':'text/javascript',
      '.png':'image/png',
      '.gif':'image/gif',
      '.jpg':'image/jpg',
      '.pdf':'application/pdf'
  }
  return contentTypes[fileExtension];
}

const deliverFile = function(file,contentType,res) {
    res.setHeader('Content-Type',`${contentType}`);
    res.statusCode=200;
    res.write(file);
    res.end();
}

const respondWithNotFound = function(res) {
    res.statusCode = 404;
    res.write('not found');
    res.end();
}

const processFileRequest = function(req,res) {
  if(res.finished) return;
  let filePath = './public'+req.url;
  let contentType = getContentType(filePath);
  req.fs.readFile(filePath,function(error,file){
    if(error) return respondWithNotFound(res);
    deliverFile(file,contentType,res);
  })
}


const tableData = function(data) {
  return `<td>${data}</td>`;
}

const toHtmlTable = function(object) {
  let date = tableData(object.date);
  let name = tableData(object.name);
  let comment = tableData(object.comment);
  return `<tr>${date} ${name} ${comment}</tr>`;
}


const registerUser = function(req,res) {
  registeredUsers.push(req.body.username);
  console.log(registeredUsers);
  res.redirect('/guestBook');
}


const respondLoginFailed = function(res) {
  res.setHeader('Set-Cookie','logInFailed=true');
  res.write('login failed');
  res.end();
}

const responseWithGuestBook = function(res) {
  res.redirect('/guestBook');
}

const processLoginRequest = function(req,res) {
  let username = req.body.username;
  if(!registeredUsers.includes(username)) return respondLoginFailed(res);
  let sessionid = new Date().getTime();
  session[sessionid] = username;
  res.setHeader('Set-Cookie',`sessionid=${sessionid}`);
  responseWithGuestBook(res);
}


const handleGuestBookReq = function(req,res) {
  let user = session[req.cookies.sessionid];
  console.log(user);
  if(!user) return res.redirect('/login.html');
}


const processLogoutRequest = function(req,res) {
  let time = new Date().toUTCString();
  res.setHeader('Set-Cookie',[`logInFailed=false; Expires=${time}`,`sessionid=0; Expires=${time}`]);
  res.redirect('/login.html')
}

const storeComments = function(req,res) {
  commentHandler.storeComment(req.body);
  res.statusCode=200;
  res.end();
}
/*============================================================================*/

let app = WebApp.create();
app.use(logger)
app.usePostProcess(processFileRequest);
app.get('/',(req,res)=>{
  res.redirect('/index.html');
})
app.get('/comments',(req,res)=>{
  let comments = commentHandler.map(toHtmlTable).join('\n');
  res.write(comments);
  res.end();
})
app.post('/register',registerUser);
app.post('/login',processLoginRequest);
app.get('/guestBook',handleGuestBookReq);
app.get('/logout',processLogoutRequest);
app.post('/submitForm',storeComments);

let server = http.createServer(app);
server.on('error',e=>console.error('**error**',e.message));
server.listen(PORT,(e)=>console.log(`server listening at ${PORT}`));