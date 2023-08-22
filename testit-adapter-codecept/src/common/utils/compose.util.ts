export const compose = (...fns) => x => fns.reduceRight((y, f) => f(y), x);
