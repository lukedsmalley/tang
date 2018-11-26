
const {Accumulator, MatchingReader, SourceLocation} = require('./utilities')

function Lexer(input, rules) {
  let reader = new MatchingReader(input)
  let location = new SourceLocation(input.filename)

  this.hasNext = async function() {
    return await reader.hasNext()
  }

  async function matchRule(rule) {
    let patterns = rule.patterns ? [...rule.patterns] : []
    if (rule.pattern) patterns.push(rule.pattern)
    for (let pattern of patterns) if (await reader.matchesPattern(pattern)) return pattern
    let match, domains = rule.domains ? [...rule.domains] : []
    if (rule.domain) domains.push(rule.domain)
    for (let domain of domains) if (match = (await reader.matchesDomain(...domain))) return match
    return undefined
  }

  async function span(rules, acc, token) {
    while (await reader.hasNext()) {
      let match = undefined
      for (let rule of rules) {
        match = rule.default !== undefined ? rule.default : await matchRule(rule)
        if (match !== undefined) {
          if (rule.token) token = rule.token
          if (!rule.ignore) acc.add(match, location.clone())
          location.walk(match)
          if (rule.children) token = await span(rule.children, acc, token)
          else if (rule.recurse) token = await span(rules, acc, token)
          if (rule.break) return token
          break
        }
      }
      if (match === undefined) throw `Unexpected symbol ${JSON.stringify(await reader.next())} (${location.toString()})`
    }
    throw `Unexpected end of input`
  }

  this.next = async function() {
    let acc = new Accumulator()
    let type = await span(rules, acc, null)
    let token = {type, value: acc.getBuffer(), location: acc.getLocation()}
    return token
  }
}

Lexer.create = async function(input, options) {
  return new Lexer(input, options.rules)
}

module.exports = {
  Lexer
}