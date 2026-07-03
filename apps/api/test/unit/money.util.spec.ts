import {
  addKobo,
  computeVatKobo,
  formatNaira,
  multiplyKoboByQuantity,
  subtractDecimalQuantities,
  subtractKobo,
  toKobo,
} from '../../src/common/money.util';

describe('money.util', () => {
  it('adds kobo amounts without floating-point drift', () => {
    expect(addKobo('100', '200', 300)).toBe(600n);
    expect(addKobo('9007199254740993', '1')).toBe(9007199254740994n); // beyond Number.MAX_SAFE_INTEGER
  });

  it('subtracts kobo amounts', () => {
    expect(subtractKobo('500', '199')).toBe(301n);
  });

  it('computes VAT at 7.5% with round-half-up', () => {
    expect(computeVatKobo('100000', 7.5)).toBe(7500n);
    expect(computeVatKobo('133', 7.5)).toBe(10n); // 9.975 -> rounds up to 10
  });

  it('formats kobo as a naira string', () => {
    expect(formatNaira('150075')).toBe('NGN 1,500.75');
    expect(formatNaira('-500')).toBe('-NGN 5.00');
  });

  it('accepts bigint input directly', () => {
    expect(toKobo(123n)).toBe(123n);
  });

  it('multiplies a kobo unit price by a decimal quantity, rounding half-up', () => {
    expect(multiplyKoboByQuantity('5000', '123.456', 3)).toBe(617280n); // exact: 5000 * 123.456 = 617280.000
    expect(multiplyKoboByQuantity('3', '0.5', 1)).toBe(2n); // 1.5 -> rounds up to 2
  });

  it('subtracts decimal quantities (e.g. meter readings) without floating point', () => {
    expect(subtractDecimalQuantities('1234.567', '1000.000', 3)).toBe('234.567');
    expect(subtractDecimalQuantities('100.000', '150.500', 3)).toBe('-50.500');
  });
});
