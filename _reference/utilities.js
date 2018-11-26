
function StringReader() {

}

StringReader.create = async function(input, options) {
  
}

function ArrayReader(input) {
  let index = 0

  this.hasNext = async () => index < input.length
  this.next = async () => input[index++]
}

function BranchingReader(stream) {
  let index = 0
  let snapshots = []
  let buffer = []

  this.hasNext = async function() {
    return index < buffer.length || await stream.hasNext()
  }

  this.next = async function() {
    if (index >= buffer.length) buffer.push(await stream.next())
    if (snapshots.length < 1) return buffer.shift()
    else return buffer[index++]
  }

  this.branch = function() {
    snapshots.push(index)
  }

  this.reject = function() {
    index = snapshots.pop()
  }

  this.merge = function() {
    snapshots.pop()
    if (snapshots.length < 1) {
      buffer.splice(0, index)
      index = 0
    }
  }
}

function Accumulator() {
  let location = null
  let buffer = undefined

  this.getLocation = () => location
  this.getBuffer = () => buffer

  this.add = function(value, _location) {
    if (!location && _location) location = _location
    if (typeof value === 'string' || value instanceof String) {
      if (buffer === undefined) buffer = ''
      buffer += value
    } else if (value instanceof Array) {
      if (buffer === undefined) buffer = value
      else buffer.push(...value)
    } else {
      if (buffer === undefined) buffer = value
      else if (buffer instanceof Array) buffer.push(value)
      else buffer = [buffer, value]
    }
  }
}

function MatchingReader(stream) {
  let reader = new BranchingReader(stream)

  this.hasNext = async function() {
    return await reader.hasNext()
  }

  this.next = async function() {
    return await reader.next()
  }

  this.matchesPattern = async function(pattern) {
    reader.branch()
    if (pattern instanceof Array || typeof pattern === 'string' || pattern instanceof String) {
      let charAt = pattern instanceof Array ? i => pattern[i] : i => pattern.charAt(i)
      for (let i = 0; i < pattern.length; i++) {
        if (!(await reader.hasNext()) || charAt(i) !== await reader.next()) {
          reader.reject()
          return false
        }
      }
    } else if (!(await reader.hasNext()) || pattern !== await reader.next()) {
      reader.reject()
      return false
    }
    reader.merge()
    return true
  }

  this.matchesDomain = async function(lower, upper) {
    reader.branch()
    if (!(await reader.hasNext())) {
      reader.reject()
      return undefined
    }
    let next = await reader.next()
    valueOf = value => typeof value === 'string' || value instanceof String ? value.codePointAt(0) : value
    if (valueOf(next) >= valueOf(lower) && valueOf(next) <= valueOf(upper)) {
      reader.merge()
      return next
    } else {
      reader.reject()
      return undefined
    }
  }
}

class SourceLocation {
  constructor(filename, line, column) {
    this.filename = filename === undefined ? '<source>' : filename
    this.line = line === undefined ? 1 : line
    this.column = column === undefined ? 1 : column
  }

  toString() {
    return `${this.filename}:${this.line}:${this.column}`
  }

  clone() {
    return new SourceLocation(this.filename, this.line, this.column)
  }

  walk(value) {
    if (value instanceof Array) {
      this.column += value.length
    } else if (typeof value === 'string' || value instanceof String) {
      for (var i = 0; i < value.length; i++) {
        if (value.charAt(i) == '\n') {
            this.line++
            this.column = 1
        } else {
            this.column++
        }
      }
    } else {
      this.column++
    }
    return this
  }
}

module.exports = {
  StringReader, ArrayReader, BranchingReader, Accumulator, MatchingReader, SourceLocation
}