
import {SourceLocation} from './location'
import {Reader, MatchingReader} from './reader'

export {Lexer}

type Domain = [string|number[], string|number[]]

interface LexerRule {
  pattern?: any
  patterns?: any[]
  domain?: Domain
  domains?: Domain[]
  default?: any
  greedy?: boolean
}

class Lexeme {
  token?: string
  value: Span

  constructor(token?: string, location: SourceLocation, value: Span) {
    this.token = token
    this.location = location
    this.value = value
  }
}

class Lexer implements Reader {
  private rules: LexerRule[]
  private reader: MatchingReader

  constructor(rules: LexerRule[], reader: Reader) {
    this.rules = rules
    this.reader = new MatchingReader(reader)
  }

  async hasNext(): Promise<boolean> {
    return await this.reader.hasNext()
  }

  private async matchesRule(rule: LexerRule): Promise<Pattern|undefined> {

  }

  private async matchRules(rules: LexerRule[], span: Span, type: string | null): Promise<string|null> {
    while (await this.reader.hasNext()) {
      let match = undefined
      for (let rule of rules) {
        match = rule.default !== undefined ? rule.default : this.matchesRule(rule)
        if (match !== undefined) {

        }
      }
      if (match === undefined) throw `Unexpected symbol ${(await reader.next()).proper()} (${this.location.toString()})`
    }
    throw 'Unexpected end of input'
  }

  async next(): Promise<Span> {
    let next = new Span()
    let type = this.matchRules(this.rules, next, null)

  }
}