const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const VIN_TRANSLITERATION = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1,
  K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
};

export function normalizeVin(value = '') {
  return String(value).trim().toUpperCase().replace(/[\s-]/g, '');
}

export function validateVin(value, { allowTestVin = true } = {}) {
  const vin = normalizeVin(value);
  if (allowTestVin && /^TESTVIN[A-Z0-9]+$/.test(vin)) {
    return { valid: true, normalized: vin, isTest: true, message: '' };
  }
  if (vin.length !== 17) return { valid: false, normalized: vin, message: 'VIN 码必须为 17 位。' };
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return { valid: false, normalized: vin, message: 'VIN 码只能使用大写字母和数字，且不能包含 I、O、Q。' };
  const sum = [...vin].reduce((total, character, index) => total + VIN_TRANSLITERATION[character] * VIN_WEIGHTS[index], 0);
  const checkDigit = sum % 11 === 10 ? 'X' : String(sum % 11);
  if (vin[8] !== checkDigit) return { valid: false, normalized: vin, message: 'VIN 校验位不正确，请检查车辆信息。' };
  return { valid: true, normalized: vin, isTest: false, message: '' };
}

export function validateTripDistance(value) {
  const distance = Number(value);
  if (!Number.isFinite(distance) || distance <= 0) return { valid: false, value: distance, message: '行驶里程必须大于 0 km。' };
  if (distance > 5000) return { valid: false, value: distance, message: '单次行驶里程不能超过 5000 km。' };
  if (Math.round(distance * 100) !== distance * 100) return { valid: false, value: distance, message: '行驶里程最多保留两位小数。' };
  return { valid: true, value: distance, message: '' };
}

export function validateTripInput({ vin, km }) {
  const vinResult = validateVin(vin);
  const distanceResult = validateTripDistance(km);
  return { valid: vinResult.valid && distanceResult.valid, vin: vinResult, distance: distanceResult };
}
