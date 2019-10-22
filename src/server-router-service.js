const server = global.server
const fs = require('fs')
const GALLERIESPATH = './gallery'
const sharp = require('sharp')
var Validator = require('jsonschema').Validator;
var v = new Validator();
const gallerySchema = require('./schemas/gallery.json')

/**
 * @param path
 * @returns true, if path exists and it's directory
**/
function isDir(path) {
    return fs.lstatSync(path).isDirectory()
}

/**
 * @param str
 * @returns string
 **/
function changeString(str) {
    return str.split(" ").join('%20')
}

/**
 * GET request 'localhost:3001/gallery'
 * @returns list of all galleries
**/
async function getGalleries(ctx)
{
  let result = {}
  result.galleries = getFilesAndDetails(GALLERIESPATH)
  server.core.response(ctx, 200, result)
}

/**
 * @param path to directory with galleries
 * @returns path and name of all galleries and name, path, fullpath, modified date of all images within gallery
**/
function getFilesAndDetails(path) {
    let result = []
    const files = fs.readdirSync(path)
    for (const [index, value] of files.entries()) {
        if (isDir(path + '/' + value)) {
            let gallery = {}
            gallery.name = value
            gallery.path = changeString(value)
            gallery.images = []
            const files2 = fs.readdirSync(path + '/' + value)
            for (const [index2, value2] of files2.entries()) {
                let image = {}
                image.path = value2
                image.fullpath = changeString(value) + '/' + value2
                image.name = getImageName(value2)
                image.modified = getFileUpdatedDate(path + '/' + value + '/' + value2)
                gallery.images.push(image)
            }
          result.push(gallery)
        }
    }
    return result
}

/**
 * @param path
 * @returns last modified date of file
**/
function getFileUpdatedDate(path) {
    return fs.statSync(path).mtime
}

/**
 * POST request 'localhost:3001/gallery'
 * Body Media type: application/json
 * @returns name and path of created gallery
**/
async function createGallery(ctx)
{
  let request = ctx.request.body
  let failResponse = {
        "code": 400,
        "payload": {
          "paths": ["name"],
          "validator": "required",
          "example": null
        },
        "name": "INVALID_SCHEMA",
        "description": "Bad JSON object: 'name' is a required property"
      }

  var validatorRes = v.validate(request, gallerySchema)
  if(!validatorRes.valid) {
      server.core.log('Validation errors: ' + "\n" + validatorRes.errors)
  }

  if(!request.name) {
    server.core.response(ctx, 400, failResponse)
  } else {
    let folder = request.name
    if (folder.includes('/')) {
      server.core.response(ctx, 400, failResponse)
    } else if (fs.existsSync(GALLERIESPATH + '/' + folder)) {
      server.core.response(ctx, 409, {"message":"Gallery with the specified name already exists."})
    } else {
      fs.mkdirSync(GALLERIESPATH + '/' + folder)
      server.core.response(ctx, 201, {"message":"Gallery created."})
    }
  }
}

/**
 * GET request 'localhost:3001/gallery/:path'
 * @param path
 * @returns gallery and content
**/
async function getGalleryByPath(ctx)
{
    let result = {}
    let folder = ctx.params.path
    let galleryPath = GALLERIESPATH + '/' + folder

    result.gallery = {}
    result.gallery.name = folder
    result.gallery.path = changeString(folder)

    if(fs.existsSync(galleryPath) && isDir(galleryPath)) {
      result.images = readGallery(folder, galleryPath)
      server.core.response(ctx, 200, result)
    } else {
      server.core.response(ctx, 404, {"message": "The selected gallery does not exist."})
    }
}

/**
 * @param path to gallery
 * @returns path, fullpath, name and modified date of images
**/
function readGallery(folder, galleryPath) {
  let images = []
  const files = fs.readdirSync(galleryPath)
  for (let file of files) {
      let image = {}
      image.path = file
      image.fullpath = changeString(folder) + '/' + file
      image.name = getImageName(file)
      image.modified = getFileUpdatedDate(galleryPath + '/' + file)
      images.push(image)
  }
  return images
}

/**
 * @param file
 * @returns name of file without extension
**/
function getImageName(i) {
    return i.split('.')[0]
}

/**
 * DELETE request 'localhost:3001/gallery/:path/:item?'
 * @param path, item?
**/
async function deleteGalleryByPath(ctx)
{
  let request = ctx.request.body
  let result = {}
  let galleryPath = ''
  if (ctx.params.item) {
      galleryPath = GALLERIESPATH + '/' + ctx.params.path + '/'+ ctx.params.item
  }
  else {
      galleryPath = GALLERIESPATH + '/' + ctx.params.path
  }

  if(fs.existsSync(galleryPath)) {
    if(isDir(galleryPath)) {
      deleteFolderRecursive(galleryPath)
      server.core.response(ctx, 200, {"message": "Gallery successfully deleted."})
    }
    else {
      deleteImage(galleryPath)
      server.core.response(ctx, 200, {"message": "Image successfully deleted."})
    }
  } else {
    server.core.response(ctx, 404, {"message": "The selected gallery/image does not exist."})
  }
}

/**
 * @param path
**/
function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file,index) {
      var curPath = path + "/" + file
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath)
      } else {
        fs.unlinkSync(curPath)
      }
    });
    fs.rmdirSync(path)
  }
};

/**
 * @param path
**/
function deleteImage(path) {
  fs.unlinkSync(path);
}

/**
 * POST request 'localhost:3001/gallery/:path'
 * @param(path)
 * @file(image)
 * @returns path, fullpath, name and modification date of uploaded image
 **/
async function uploadToGallery(ctx)
{
    let result = {}

    if (!ctx.request.files.name) {
      server.core.response(ctx, 400, {"message":"Invalid request - no file to upload."})
    } else if (!fs.existsSync(GALLERIESPATH + '/' + ctx.params.path)) {
        server.core.response(ctx, 404, {"message":"Upload gallery not found."})
    } else {
      let imageName = ctx.request.files.name.name
      let imagePath = GALLERIESPATH + '/' + ctx.params.path + '/' + ctx.request.files.name.name
      let oldImagePath = ctx.request.files.name.path

      fs.renameSync(oldImagePath, imagePath)
      let uploaded = []
      let image = {}
      image.path = imageName
      image.fullpath = changeString(ctx.params.path) + '/' + ctx.request.files.name.name
      image.name = getImageName(imageName)
      image.modified = getFileUpdatedDate(imagePath)
      uploaded.push(image)
      result.uploaded = uploaded
      server.core.response(ctx, 201, result)
  }
}


/** GET request 'localhost:3001/images/{w}x{h}/:path/:item'
 * @params width, height, path, img
 * @returns resized image
 **/
async function getImageByPath(ctx)
{
  let result = null
  let galleryPath = GALLERIESPATH + '/' + ctx.params.path
  let fullImagePath = GALLERIESPATH + '/' + ctx.params.path + '/' + ctx.params.item
  var imageWidth = Number(ctx.params.w)
  var imageHeight = Number(ctx.params.h)
  var width = 0, height = 0

  if(!fs.existsSync(fullImagePath)) {
    server.core.response(ctx, 404, {"message":"The specified image not found."})
  } else {
    var image = fs.readFileSync(fullImagePath)

    if(imageWidth == 0 && imageHeight == 0) {
      throw new WHError()
    }

    let metadata = await getMetadata(image)

    const ratio = (metadata.width) / (metadata.height)
    if(imageWidth == 0) {
        imageWidth = Math.round(imageHeight * ratio)
    }

    if(imageHeight == 0) {
        imageHeight = Math.round(imageWidth / ratio)
    }

    result = await resizeImage(image, imageWidth, imageHeight)
    server.core.response(ctx, 200, result)

  }
}

function WHError() {
  let result = {}
  result.message = 'Weight and height cannot both be 0.'
  return result
}

function resizeImage(image, imageWidth, imageHeight) {
  return new Promise((resolve, reject) => {
    sharp(image)
    .resize(Number(imageWidth), Number(imageHeight))
    .toBuffer()
    .then(data => {
      resolve(data)
    })
    .catch(error => {
      console.log(error)
      reject(error)
      });
});
}

function getMetadata(image) {
  return new Promise((resolve, reject) => {
    sharp(image)
    .metadata()
    .then(data => {
      resolve(data)
    })
    .catch(error => {
      console.log(error)
      reject(error)
      });
});
}

module.exports =
{
getGalleries,
createGallery,
getGalleryByPath,
uploadToGallery,
deleteGalleryByPath,
getImageByPath
};
