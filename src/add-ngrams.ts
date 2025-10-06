// import { initMongo, getDb } from './db/mongo';
// import { Product } from './models/types';
// import { generateNgrams } from './utils/ngrams';

// async function updateProductsWithNgrams() {
//   await initMongo();
//   const db = getDb();
//   const productsCol = db.collection<Product>('ecommerce');

//   const products = await productsCol.find({ ngrams: { $exists: false } }).toArray();
  
//   if (products.length === 0) {
//     console.log("All products already have n-grams. Exiting.");
//     process.exit(0);
//   }

//   console.log(`Found ${products.length} products to update...`);

//   for (const product of products) {
//     const textToAnalyze = `${product.title || ''} ${product.description || ''}`;
//     const ngrams = generateNgrams(textToAnalyze);
    
//     await productsCol.updateOne(
//       { _id: product._id },
//       { $set: { ngrams: ngrams } }
//     );
//   }

//   console.log("Finished updating all products with n-grams.");
//   process.exit(0);
// }

// updateProductsWithNgrams().catch(err => {
//   console.error(err);
//   process.exit(1);
// });