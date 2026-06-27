# Davinto Image Sync Workflow

Product and category image URLs are stored in MongoDB. Changing local assets,
frontend fallbacks, or `seedLaunchData.js` does not automatically update
existing MongoDB documents.

Use the launch seed only when intentionally creating or resetting launch data.
For image-only changes, do not reseed products. Run the image sync instead:

```sh
npm run sync:images
```

The sync script reads the current local assets under `client/public/images`,
builds the launch product/category image map, and updates only these fields when
the existing value is blank or a known legacy/local launch path:

- `Product.colors[].images[].url`
- `Category.image.url`

It is intentionally fallback/legacy-safe. It does not overwrite remote admin
uploads, `http://` or `https://` URLs, or Cloudinary URLs such as
`cloudinary.com` / `res.cloudinary.com`. Protected URLs are logged as skipped.

It does not delete, recreate, or reseed products. It does not change product
IDs, slugs, names, prices, stock, category counts, offers, bundles, discounts,
checkout totals, orders, delivery fees, Paymob, or admin settings.

The older `fix-image-paths.js` script is for known stale URL migrations such as
`/images/t-shirts/...jpg` to `/images/blanks/...webp`. The repeatable workflow
for future launch asset updates is `sync-image-paths.js`.
