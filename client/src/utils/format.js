export const formatMoney = (value) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(value || 0);

export const formatDate = (value) =>
  new Intl.DateTimeFormat('en-ZM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export const formatDateShort = (value) => new Intl.DateTimeFormat('en-ZM', { dateStyle: 'medium' }).format(new Date(value));

export const titleCase = (value) =>
  (value || '')
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
