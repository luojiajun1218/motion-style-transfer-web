import { isCurrentResultLoad } from '../src/utils/resultLoadGuard'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

assert(
  isCurrentResultLoad('new-result', () => 'new-result'),
  'expected current result load to be accepted'
)

assert(
  !isCurrentResultLoad('old-result', () => 'new-result'),
  'expected stale result load to be ignored'
)
