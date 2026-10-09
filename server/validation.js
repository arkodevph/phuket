import { buyingTimeframes, fundingOptions } from '../src/enquiry-options.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const controlCharacters = /[\u0000-\u001f\u007f]/;

export function validateEnquiry(body) {
  const errors = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { form: 'Please submit your enquiry as an object.' } };
  }

  function text(field, label, maxLength, required = true) {
    const value = typeof body[field] === 'string' ? body[field].trim() : '';
    if ((required && !value) || value.length > maxLength || (field !== 'note' && controlCharacters.test(value))) {
      errors[field] = `Please enter a valid ${label}.`;
    }
    return value;
  }

  const name = text('name', 'name', 100);
  const email = text('email', 'email address', 254);
  const mobile = text('mobile', 'mobile number', 25);
  const location = text('location', 'preferred location', 150);
  const funding = text('funding', 'purchase funding option', 50);
  const timeframe = text('timeframe', 'buying timeframe', 50);
  const note = text('note', 'additional details', 1000, false);
  const budget = typeof body.budget === 'number' || (typeof body.budget === 'string' && /^\d+$/.test(body.budget))
    ? Number(body.budget) : NaN;
  const mobileDigits = mobile.replace(/\D/g, '');

  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!emailPattern.test(email)) errors.email = 'Please enter a valid email address.';
  if (!/^\+?[\d\s().-]+$/.test(mobile) || mobileDigits.length < 8 || mobileDigits.length > 15) {
    errors.mobile = 'Please enter a valid mobile number.';
  }
  if (!Number.isSafeInteger(budget) || budget <= 0) errors.budget = 'Please enter an approximate budget in whole Australian dollars.';
  if (location.length < 2) errors.location = 'Please enter your preferred location.';
  if (!fundingOptions.includes(funding)) errors.funding = 'Choose cash purchase or finance required.';
  if (!buyingTimeframes.includes(timeframe)) errors.timeframe = 'Please choose your expected buying timeframe.';
  if (note.includes('\u0000')) errors.note = 'Please enter valid additional details.';

  return { errors, value: { name, email, mobile, budget, location, funding, timeframe, note } };
}
