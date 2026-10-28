import { GSTRate } from '../types';

/**
 * Formats a number as Indian Currency (INR)
 * e.g., 125400 -> "₹ 1,25,400.00"
 */
export function formatINR(amount: number, showDecimals: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return showDecimals ? '₹ 0.00' : '₹ 0';
  }

  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  
  const parts = rounded.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];
  
  const isNegative = integerPart.startsWith('-');
  if (isNegative) {
    integerPart = integerPart.slice(1);
  }

  // Indian numbering system: 3 digits, then groups of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const prefix = isNegative ? '-₹ ' : '₹ ';

  return showDecimals 
    ? `${prefix}${formattedInteger}.${decimalPart}`
    : `${prefix}${formattedInteger}`;
}

/**
 * Formats date to Indian standard readable format: "24 Oct 2026, 02:45 PM"
 */
export function formatDateTime(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Formats date only: "24/10/2026"
 */
export function formatDateOnly(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats quantity nicely, showing decimals or grams for fractional weights
 * e.g., 0.25 Kg -> "0.25 Kg (250g)", 0.5 Kg -> "0.5 Kg (500g)", 2 Pcs -> "2 Pcs"
 */
export function formatQuantity(qty: number, unit: string = 'Pcs'): string {
  if (isNaN(qty) || qty === null || qty === undefined) return `0 ${unit}`;
  
  if (Number.isInteger(qty)) {
    return `${qty} ${unit}`;
  }

  const cleanDecimal = Math.round((qty + Number.EPSILON) * 1000) / 1000;
  if (unit === 'Kg') {
    if (cleanDecimal < 1) {
      const grams = Math.round(cleanDecimal * 1000);
      return `${cleanDecimal} Kg (${grams}g)`;
    }
    return `${cleanDecimal} Kg`;
  }

  return `${cleanDecimal} ${unit}`;
}

/**
 * Calculates GST components when price is inclusive of GST (Standard Indian MRP system)
 */
export function calculateGSTFromInclusive(totalPrice: number, gstRate: GSTRate) {
  if (gstRate === 0 || totalPrice <= 0) {
    return {
      taxableAmount: totalPrice,
      cgstRate: 0,
      sgstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      totalTax: 0,
      total: totalPrice,
    };
  }

  const taxMultiplier = 1 + gstRate / 100;
  const taxableAmount = Math.round((totalPrice / taxMultiplier + Number.EPSILON) * 100) / 100;
  const totalTax = Math.round((totalPrice - taxableAmount + Number.EPSILON) * 100) / 100;
  const halfTax = Math.round((totalTax / 2 + Number.EPSILON) * 100) / 100;
  const cgstAmount = halfTax;
  const sgstAmount = Math.round((totalTax - halfTax + Number.EPSILON) * 100) / 100;

  return {
    taxableAmount,
    cgstRate: gstRate / 2,
    sgstRate: gstRate / 2,
    cgstAmount,
    sgstAmount,
    totalTax,
    total: totalPrice,
  };
}

/**
 * Validates Indian GSTIN structure (15 alphanumeric characters)
 * e.g., 27AABCU9603R1ZM
 */
export function validateGSTIN(gstin: string): boolean {
  if (!gstin) return true; // Optional field
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstin.trim().toUpperCase());
}

/**
 * Converts a number to Indian Rupees words
 * e.g., 1450 -> "One Thousand Four Hundred Fifty Rupees Only"
 */
export function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - n) * 100);

  function convertTwoDigits(n: number): string {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
  }

  let words = '';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const remainder = Math.floor(n % 100);

  if (crore > 0) {
    words += convertTwoDigits(crore) + 'Crore ';
  }
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + 'Lakh ';
  }
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + 'Thousand ';
  }
  if (hundred > 0) {
    words += a[hundred] + 'Hundred ';
  }
  if (remainder > 0) {
    if (words !== '') words += 'and ';
    words += convertTwoDigits(remainder);
  }

  let result = words.trim() + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convertTwoDigits(paise).trim() + ' Paise';
  }
  result += ' Only';

  return result.replace(/\s+/g, ' ');
}

/**
 * Exports data to CSV file and triggers browser download
 */
export function exportToCSV(filename: string, rows: (string | number)[][]) {
  const processRow = (row: (string | number)[]) => {
    return row.map(val => {
      const stringVal = val === null || val === undefined ? '' : String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    }).join(',');
  };

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(processRow).join('\r\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
