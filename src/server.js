"use strict";

const Koa           = require('koa');
const Router        = require('koa-router');
const logger        = require('koa-logger');
const body          = require('koa-body');
const serve        = require('koa-static');

const server        = {};
global.server       = server;
server.config       = require('../config.json');
server.routerStream = require('./server-router.js');
server.core         = require('./server-core.js');
server.uptime       = new Date();

const app = new Koa();

app.use(body({multipart:true}))
app.use(logger())
app.use(server.routerStream.routes())
app.use(server.routerStream.allowedMethods())

app.listen(server.config.serverPort)
server.core.log(" ##### SERVER-SL STARTED ON PORT :",server.config.serverPort,'#####')
