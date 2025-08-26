export type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string; // short description used in lists
  summary?: string; // longer summary shown on detail page
  thumbnail?: string; // URL to a thumbnail image (public/ or external)
  externalLink?: string; // when present, this book should be purchased on an external store
};
// NOTE: Removed in-repo sample data to ensure all domain data is loaded from the backend.
