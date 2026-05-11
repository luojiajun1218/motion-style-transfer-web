import {
  buildNextCustomStyles,
  normalizeStoredStyles,
  type CustomStyle,
} from '../src/hooks/useCustomStyles'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const legacy = normalizeStoredStyles([{ name: 'old', fileId: '1', addedAt: 1 }])
assert(legacy[0].storage === 'persistent', 'legacy stored styles should load as persistent')

const persistent = buildNextCustomStyles([], 'walk', 'file-1', 'persistent')
assert(persistent.ok, 'persistent style should be added')
assert(persistent.styles[0].storage === 'persistent', 'persistent style should keep storage mode')

const duplicate = buildNextCustomStyles(persistent.styles, 'walk', 'file-2', 'temporary')
assert(!duplicate.ok, 'duplicate style names should be rejected across storage modes')

const fourPersistent = ['a', 'b', 'c', 'd'].reduce((styles, name, index) => {
  const result = buildNextCustomStyles(styles, name, `file-${index}`, 'persistent')
  return result.styles
}, [] as CustomStyle[])

const fifthPersistent = buildNextCustomStyles(fourPersistent, 'e', 'file-5', 'persistent')
assert(!fifthPersistent.ok, 'fifth persistent style should be rejected')

const temporaryAfterLimit = buildNextCustomStyles(fourPersistent, 'temp', 'file-temp', 'temporary')
assert(temporaryAfterLimit.ok, 'temporary styles should not count toward persistent limit')
