import { orbeProducts } from "@/lib/mock/data";

export const orbeOneService = {
  async products() { return orbeProducts; },
  async get(slug: string) { return orbeProducts.find((p) => p.slug === slug) ?? null; },
};
