import { _internals } from '~/vite/types'

const {
  toInterfaceName,
  toFolderName,
  toFileName,
  toModuleFolder,
  emitField,
  buildInterface,
  emitAppMapFile,
  emitIndexFile
} = _internals

describe('name conversion utilities', () => {
  describe('toInterfaceName', () => {
    it('removes spaces from doctype label', () => {
      expect(toInterfaceName('Loan Application')).toBe('LoanApplication')
    })

    it('handles single word', () => {
      expect(toInterfaceName('User')).toBe('User')
    })

    it('handles multiple spaces', () => {
      expect(toInterfaceName('Loan  Application  Item')).toBe('LoanApplicationItem')
    })
  })

  describe('toFolderName', () => {
    it('converts label to snake_case', () => {
      expect(toFolderName('Loan Application')).toBe('loan_application')
    })

    it('lowercases single word', () => {
      expect(toFolderName('User')).toBe('user')
    })
  })

  describe('toFileName', () => {
    it('converts display name to kebab-case', () => {
      expect(toFileName('Loan Management')).toBe('loan-management')
    })

    it('converts snake_case to kebab-case', () => {
      expect(toFileName('loan_management')).toBe('loan-management')
    })

    it('handles single word', () => {
      expect(toFileName('Core')).toBe('core')
    })
  })

  describe('toModuleFolder', () => {
    it('returns snake_case input unchanged', () => {
      expect(toModuleFolder('loan_management')).toBe('loan_management')
    })

    it('converts display name to snake_case', () => {
      expect(toModuleFolder('Loan Management')).toBe('loan_management')
    })
  })
})

describe('emitField', () => {
  it('emits a string field', () => {
    const result = emitField({
      fieldname: 'first_name',
      fieldtype: 'Data',
      label: 'First Name'
    })
    expect(result.declaration).toContain('first_name')
    expect(result.declaration).toContain('string')
    expect(result.childDoctype).toBeNull()
  })

  it('emits a required field without optional marker', () => {
    const result = emitField({
      fieldname: 'first_name',
      fieldtype: 'Data',
      label: 'First Name',
      reqd: 1
    })
    expect(result.declaration).toBe('  first_name: string')
  })

  it('emits an optional field with ? marker', () => {
    const result = emitField({
      fieldname: 'middle_name',
      fieldtype: 'Data',
      label: 'Middle Name',
      reqd: 0
    })
    expect(result.declaration).toBe('  middle_name?: string')
  })

  it('emits a number field', () => {
    const result = emitField({
      fieldname: 'amount',
      fieldtype: 'Currency',
      label: 'Amount'
    })
    expect(result.declaration).toContain('number')
  })

  it('emits a Check field as non-optional 0 | 1', () => {
    const result = emitField({
      fieldname: 'is_active',
      fieldtype: 'Check',
      label: 'Is Active'
    })
    expect(result.declaration).toBe('  is_active: 0 | 1')
  })

  it('emits a Select field as union type', () => {
    const result = emitField({
      fieldname: 'status',
      fieldtype: 'Select',
      label: 'Status',
      options: 'Draft\nApproved\nRejected'
    })
    expect(result.declaration).toContain('\'Draft\' | \'Approved\' | \'Rejected\'')
  })

  it('emits a Table field with child reference', () => {
    const result = emitField({
      fieldname: 'items',
      fieldtype: 'Table',
      label: 'Items',
      options: 'Loan Application Item'
    })
    expect(result.declaration).toContain('LoanApplicationItem[]')
    expect(result.childDoctype).toBe('Loan Application Item')
  })

  it('emits a Link field with options in comment', () => {
    const result = emitField({
      fieldname: 'customer',
      fieldtype: 'Link',
      label: 'Customer',
      options: 'Customer'
    })
    expect(result.declaration).toContain('string')
    expect(result.comment).toContain('(Customer)')
  })
})

describe('buildInterface', () => {
  it('generates interface for a regular DocType', () => {
    const artifact = buildInterface({
      name: 'Loan Application',
      modified: '2024-01-01',
      istable: 0,
      fields: [
        { fieldname: 'applicant', fieldtype: 'Data', label: 'Applicant', reqd: 1 },
        { fieldname: 'amount', fieldtype: 'Currency', label: 'Amount' },
        { fieldname: 'section_break_1', fieldtype: 'Section Break', label: 'Details' }
      ]
    })
    expect(artifact.source).toContain('export interface LoanApplication extends DocType')
    expect(artifact.source).toContain('applicant: string')
    expect(artifact.source).toContain('amount?: number')
    expect(artifact.source).not.toContain('section_break_1')
  })

  it('generates interface for a child table DocType', () => {
    const artifact = buildInterface({
      name: 'Loan Item',
      modified: '2024-01-01',
      istable: 1,
      fields: [
        { fieldname: 'item_name', fieldtype: 'Data', label: 'Item Name', reqd: 1 }
      ]
    })
    expect(artifact.source).toContain('export interface LoanItem extends ChildDocType')
  })

  it('tracks child doctype references', () => {
    const artifact = buildInterface({
      name: 'Loan Application',
      modified: '2024-01-01',
      istable: 0,
      fields: [
        { fieldname: 'items', fieldtype: 'Table', label: 'Items', options: 'Loan Item' }
      ]
    })
    expect(artifact.childDoctypeLabels).toContain('Loan Item')
  })
})

describe('emitAppMapFile', () => {
  it('generates augmentation file for apps and modules', () => {
    const result = emitAppMapFile({
      frappe: ['core', 'desk'],
      myapp: ['loan_management']
    })
    expect(result).toContain('declare module \'@beninfintech/frappe/vite\'')
    expect(result).toContain('FrappeAppMap')
    expect(result).toContain('\'frappe\': \'core\' | \'desk\'')
    expect(result).toContain('\'myapp\': \'loan_management\'')
  })

  it('handles apps with no modules', () => {
    const result = emitAppMapFile({ emptyapp: [] })
    expect(result).toContain('\'emptyapp\': never')
  })
})

describe('emitIndexFile', () => {
  it('generates re-export file for all modules', () => {
    const result = emitIndexFile(['loan-management', 'core'])
    expect(result).toContain('export type * from \'./_base\'')
    expect(result).toContain('export type * from \'./core\'')
    expect(result).toContain('export type * from \'./loan-management\'')
  })

  it('sorts module keys alphabetically', () => {
    const result = emitIndexFile(['zebra', 'alpha'])
    const lines = result.split('\n')
    const alphaIdx = lines.findIndex((l) => l.includes('alpha'))
    const zebraIdx = lines.findIndex((l) => l.includes('zebra'))
    expect(alphaIdx).toBeLessThan(zebraIdx)
  })
})
