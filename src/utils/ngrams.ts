// /**
//  * Generates n-grams for a given string.
//  * @param input The string to process.
//  * @param minSize The minimum n-gram size (e.g., 2 for bigrams).
//  * @param maxSize The maximum n-gram size.
//  * @returns A string of unique n-grams, joined by spaces.
//  */
// export function generateNgrams(input: string, minSize: number = 2, maxSize: number = 10): string {
//   if (!input) {
//     return '';
//   }

//   const text = input.toLowerCase().replace(/\s+/g, ' '); // Normalize text
//   const ngrams = new Set<string>();

//   for (let n = minSize; n <= maxSize; n++) {
//     if (text.length >= n) {
//       for (let i = 0; i <= text.length - n; i++) {
//         ngrams.add(text.substring(i, i + n));
//       }
//     }
//   }
//   return Array.from(ngrams).join(' ');
// }