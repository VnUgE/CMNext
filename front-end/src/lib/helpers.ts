import { isNaN, truncate, isNumber } from 'lodash-es';

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatDate = (date: string | Date | number | undefined): string => {
  if (!date) return 'Never';

  // if number, assume unix timestamp
  if (isNumber(date) && !isNaN(date)) {
    return new Date(date * 1000).toLocaleDateString();
  } else {
    return new Date(date).toLocaleDateString();
  }
};

export const truncateText = (text: string, maxLength: number = 100) => {
  return truncate(text, { length: maxLength, omission: '...' });
};
