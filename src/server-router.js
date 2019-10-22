const server          = global.server;
const Router          = require('koa-router');
const routerService   = require('./server-router-service.js');
let router            = new Router({});

router.get('/gallery', routerService.getGalleries);
router.post('/gallery', routerService.createGallery);

router.get('/gallery/:path', routerService.getGalleryByPath);
router.post('/gallery/:path', routerService.uploadToGallery);
router.delete('/gallery/:path/:item?', routerService.deleteGalleryByPath);

router.get('/images/:w*(x):h/:path/:item', routerService.getImageByPath);

module.exports = router;
