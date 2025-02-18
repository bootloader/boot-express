
const config = require('@bootloader/config');
const http = require('http');

const { loadApp } = require("./router");

const APP = process.env.APP || "app";

 function BootLoader(...args){
  let mappings = (args || []);
  let options = {};
  let app = null;

  this.map =  function(o){
    mappings.push(o);
    return this;
  }

  this.create =  function(onCreate){
    options = mappings.filter(function(arg){
      return arg.name == APP;
    })[0] || options;
    let { name = "app",  context } = options;
    console.log(`APP[${name}]: Creating on ${context}`);
    app = require(`./../${name}/app.js`);
    // Auto-load controllers
    loadApp({ name : name, context : context, app});
    if(onCreate && typeof onCreate =='function')  onCreate({...options,app})
    return this;
  }

  this.launch =  function(onLaunch){
    const port = process.env.PORT || config.get("server.port");
    console.log(`APP[${options.name}]: Launching on ${port}:/${options.context}`);
    //Create a server
    var server = http.createServer(app);
    //Lets start our server
    server.listen(port, function(){
        //console.log("NGROK_URL",config.getIfPresent("NGROK_URL"))
        //console.log("ngrok.url",config.store("ngrok").url)
        //Callback triggered when server is successfully listening. Hurray!
        console.log(`APP[${options.name}]: Listening on http://localhost:${port}:/${options.context}`);
        //noway.emit('noway.started', null)
        if(onLaunch && typeof onLaunch =='function') onLaunch({...options, app,server,config})
    });
    return this;
  }
};


module.exports = {
  BootLoader
}