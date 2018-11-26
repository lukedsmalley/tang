
const {BranchingReader, ArrayReader} = require('./utilities')

function Parser(input, productions) {
  let reader = new BranchingReader(input)
  
  this.hasNext = async function() {
    return await reader.hasNext()
  }

  function appendObject(target, ...sources) {
    for (let source of sources) {
      for (let key in source) {
        let values = source[key] instanceof Array ? source[key] : [source[key]]
        if (target[key] === undefined) target[key] = source[key]
        else if (target[key] instanceof Array) target[key].push(...values)
        else target[key] = [target[key], ...values]
      }
    }
    return target
  }

  async function tryProduce(node, pattern, tokens) {
    let properties = {}
    pattern.branch()
    tokens.branch()
    try {
      await produce(properties, pattern, tokens)
    } catch (err) {
      pattern.reject()
      tokens.reject()
      return false
    }
    appendObject(node, properties)
    pattern.merge()
    tokens.merge()
    return true
  }

  async function trySelect(node, patterns, lexemes) {
    for (let pattern of patterns) if (await tryProduce(node, new BranchingReader(new ArrayReader(pattern)), lexemes)) return true
    return false
  }

  async function produce(node, pattern, lexemes) {
    while (await pattern.hasNext()) {
      let next = await pattern.next()
      console.log(next)
      let subnode = undefined
      if (next.rule) {
        subnode = {type: next.rule}
        await produce(subnode, new BranchingReader(new ArrayReader(productions[next.rule])), lexemes)
      } else if (next.optional) {
        await tryProduce(node, new BranchingReader(new ArrayReader(next.optional)), lexemes)
      } else if (next.repeated) {
        await produce(node, new BranchingReader(new ArrayReader(next.repeated)), lexemes)
        for (;;) if (!(await tryProduce(node, new BranchingReader(new ArrayReader(next.repeated)), lexemes))) break //TODO: Must match once
      } else if (next.select) {
        if (!(await trySelect(node, next.select, lexemes))) {
          if (!(await lexemes.hasNext())) {
            if (next.expectation) throw `Expected ${next.expectation} but reached end of input`
            else throw `Unexpected end of input in ${node.type}`
          }
          let actual = await lexemes.next()
          if (next.expectation) throw `Expected ${next.expectation} but received ${actual.type} '${actual.value}' (${actual.location.toString()})`;
          else throw `Encountered invalid ${actual.type} '${actual.value}' in ${node.type} (${actual.location.toString()})`
        }
      } else if (next.type) {
        if (!(await lexemes.hasNext())) throw `Expected ${next.type} but reached end of input`
        let actual = await lexemes.next()
        if (actual.type === next.type) subnode = actual
        else throw `Expected ${next.type} but received ${actual.type} (${actual.location.toString()})`
      } else if (next.value) {
        if (!(await lexemes.hasNext())) throw `Expected '${next.value}' but reached end of input`
        let actual = await lexemes.next()
        if (actual.value === next.value) subnode = actual
        else throw `Expected '${next.value}' but received '${actual.value}' (${actual.location.toString()})`
      }
      if (subnode !== undefined) {
        if (next.valueAsProperty) {
          if (await lexemes.hasNext()) appendObject(node, {[next.valueAsProperty]: await lexemes.next()})
          else throw 'Expected another token, but reached end of input'
        } else if (next.property) {
          appendObject(node, {[next.property]: subnode})
        }
      }
    }
  }

  this.next = async function() {
    let type = Object.keys(productions)[0]
    let ast = {type}
    await produce(ast, new BranchingReader(new ArrayReader(productions[type])), reader)
    if (await reader.hasNext()) {
      let actual = await reader.next()
      throw `Expected end of input but received ${actual.type} '${actual.value}' (${actual.location.toString()})`
    }
    return ast
  }
}

Parser.create = async function(input, options) {
  return new Parser(input, options.rules)
}

module.exports = {
  Parser
}