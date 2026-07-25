import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Products.
 *
 * The reason this is a collection rather than markup: adding the next tool
 * should be one file. That is the whole argument for Astro on this site, so
 * the schema has to carry everything a card needs — nothing may live in the
 * page template that varies per product.
 */
const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),

    /**
     * What a reader can actually do today. Kept deliberately narrow, because
     * the failure mode is a page implying something is purchasable before it
     * is — the product site already tells people Clawform is not released, and
     * this one must not contradict it.
     */
    status: z.enum(['pre-release', 'in-development', 'available']),
    /** Short, literal, checkable. Rendered next to the name. */
    statusNote: z.string(),

    /**
     * Per-product even though every value is the same today. Joseki currently
     * shares Clawform's accent; when that splits, this field is the seam it
     * splits along. Omitted means "inherit the site accent".
     */
    accent: z.string().optional(),

    url: z.string().url().optional(),
    repo: z.string().url().optional(),
    npm: z.string().optional(),
    order: z.number(),
  }),
});

export const collections = { products };
