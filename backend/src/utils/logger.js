// Minimal levelled logger. Silent under NODE_ENV=test so test output stays readable.
const silent = process.env.NODE_ENV === 'test';

const write = (level, args) => {
  if (silent) return;
  const ts = new Date().toISOString();
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[${ts}] ${level.toUpperCase()}`, ...args);
};

module.exports = {
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args),
};
