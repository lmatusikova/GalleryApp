const server   = global.server;

function getTime()
{
    var tzoffset = (new Date()).getTimezoneOffset() * 60000
    var date     = (new Date(Date.now() - tzoffset)).toISOString().replace(/T/, ' ').replace(/\..+/, '')
    return date
}

function log(args)
{
    var a = Array.prototype.slice.call(arguments)
    if (a && a[0])    a[0] = getTime() + ': ' + a[0]
    console.log.apply(console, a)
}

function toHHMMSS(time)
{
    var sec_num = parseInt(time)
    var hours   = Math.floor(sec_num / 3600)
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60)
    var seconds = sec_num - (hours * 3600) - (minutes * 60)

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds
}

function response(ctx, status, data)
{
    ctx.status = status
    return ctx.body = data
}

module.exports =
{
    log,
    toHHMMSS,
    response
};
