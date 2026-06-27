// Product images are admin-controlled by default.
// Category images are admin-controlled by default.
// localImageManifest is fallback only for product/category images.
// Static backgrounds can still be code-controlled with local static paths.
//
// Product fallback images:
// 1. Put the image in client/public/images/...
// 2. Update the product slug/color array below.
// 3. Commit and deploy.
//
// Category fallback images:
// 1. Put the image in client/public/images/...
// 2. Update categoryImageOverrides below.
// 3. Commit and deploy.

export const productImageOverrides = {
  "black-t-shirt": {
    Black: [
      "/images/blanks/black/1.webp",
      "/images/blanks/black/2.webp",
      "/images/blanks/black/3.webp",
      "/images/blanks/black/4.webp",
    ],
  },
  "white-t-shirt": {
    White: [
      "/images/blanks/white/1.webp",
      "/images/blanks/white/2.webp",
      "/images/blanks/white/3.webp",
      "/images/blanks/white/4.webp",
    ],
  },
  "beige-t-shirt": {
    Beige: [
      "/images/blanks/beige/1.webp",
      "/images/blanks/beige/2.webp",
      "/images/blanks/beige/3.webp",
      "/images/blanks/beige/4.webp",
    ],
  },
  "pink-t-shirt": {
    Pink: [
      "/images/blanks/pink/1.webp",
      "/images/blanks/pink/2.webp",
      "/images/blanks/pink/3.webp",
      "/images/blanks/pink/4.webp",
    ],
  },
  "art-piece-1": {
    White: ["/images/art-and-history/1.webp"],
  },
  "art-piece-2": {
    White: ["/images/art-and-history/2.webp"],
  },
  "art-piece-3": {
    White: ["/images/art-and-history/3.webp"],
  },
  "art-piece-4": {
    White: ["/images/art-and-history/4.webp"],
  },
  "art-piece-5": {
    White: ["/images/art-and-history/5.webp"],
  },
  "art-piece-6": {
    White: ["/images/art-and-history/6.webp"],
  },
  "art-piece-7": {
    White: ["/images/art-and-history/7.webp"],
  },
  "art-piece-8": {
    White: ["/images/art-and-history/8.webp"],
  },
  "art-piece-9": {
    White: ["/images/art-and-history/9.webp"],
  },
  "art-piece-10": {
    White: ["/images/art-and-history/10.webp"],
  },
  "art-piece-11": {
    White: ["/images/art-and-history/11.webp"],
  },
  "art-piece-12": {
    White: ["/images/art-and-history/12.webp"],
  },
  "art-piece-13": {
    White: ["/images/art-and-history/13.webp"],
  },
  "art-piece-14": {
    White: ["/images/art-and-history/14.webp"],
  },
  "art-piece-15": {
    White: ["/images/art-and-history/15.webp"],
  },
  "art-piece-16": {
    White: ["/images/art-and-history/16.webp"],
  },
  "art-piece-17": {
    White: ["/images/art-and-history/17.webp"],
  },
  "art-piece-18": {
    White: ["/images/art-and-history/18.webp"],
  },
};

export const categoryImageOverrides = {
  blanks: "/images/blanks/black/3.webp",
  "art-and-history": "/images/art-and-history/1.webp",
};
