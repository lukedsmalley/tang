
const {createReadStream} = require('fs')

function FileReader(filename, stream) {
  this.filename = filename
  let buffer = null

  this.hasNext = function() {
    return new Promise(function(resolve, reject) {
      if (buffer !== null) {
        resolve(true)
      } else {
        stream.once('error', reject)
        buffer = stream.read(1)
        stream.removeAllListeners('error')
        resolve(buffer !== null)
      }
    })
  }

  this.next = async function() {
    await this.hasNext()
    let next = buffer instanceof Buffer ? buffer[0] : buffer
    buffer = null
    return next
  }
}

FileReader.create = function(input, options) {
  let stream = createReadStream(options.filename, {encoding: options.encoding})
  return new Promise(function(resolve, reject) {
    stream.once('error', reject)
    stream.once('readable', () => {
      stream.removeAllListeners('error')
      resolve(new FileReader(options.filename, stream))
    })
  })
}

module.exports = {
  FileReader
}