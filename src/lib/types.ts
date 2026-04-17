// Product types
export interface ProductImage {
  url: string;
  alt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc: string | null;
  price: number;
  comparePrice: number | null;
  images: string; // JSON string
  categoryId: string;
  brand: string | null;
  stock: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  active: boolean;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  featured: boolean;
  sortOrder: number;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  title: string | null;
  comment: string;
  verified: boolean;
  createdAt: string;
}

export interface OrderItemData {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: "pending" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";
  items: string; // JSON string
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: string; // JSON string
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email?: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  comparePrice: number | null;
  quantity: number;
  image: string;
  stock: number;
}

// View types for client-side routing
export type AppView =
  | { type: "home" }
  | { type: "products"; categoryId?: string; categorySlug?: string; search?: string; sort?: string; minPrice?: number; maxPrice?: number }
  | { type: "product-detail"; productId: string; productSlug?: string; categorySlug?: string }
  | { type: "cart" }
  | { type: "checkout" }
  | { type: "orders" }
  | { type: "order-detail"; orderId: string }
  | { type: "order-confirmation"; orderNumber: string; orderId: string }
  | { type: "wishlist" }
  | { type: "compare" }
  | { type: "profile"; id?: string }
  | { type: "auth"; prefilledEmail?: string; authMode?: 'signin' | 'signup' | 'forgot-password' | 'reset-password' }
  | { type: "admin"; role?: string };

/**
 * Convert an AppView to a shareable browser URL path.
 * Used for syncing Zustand state with browser history.
 */
export function viewToUrl(view: AppView): string {
  switch (view.type) {
    case "home":
      return "/";
    case "products": {
      const params = new URLSearchParams();
      if (view.search) params.set("search", view.search);
      if (view.sort) params.set("sort", view.sort);
      
      // Use category for slug, categoryId for UUID fallback
      if (view.categorySlug) params.set("category", view.categorySlug);
      else if (view.categoryId) params.set("categoryId", view.categoryId);
      
      if (view.minPrice !== undefined) params.set("minPrice", String(view.minPrice));
      if (view.maxPrice !== undefined) params.set("maxPrice", String(view.maxPrice));
      const qs = params.toString();
      return `/products${qs ? `?${qs}` : ""}`;
    }
    case "product-detail":
      if (view.categorySlug && view.productSlug) {
        return `/products?category=${encodeURIComponent(view.categorySlug)}/${encodeURIComponent(view.productSlug)}`;
      }
      // Fallbacks
      return view.productSlug
        ? `/product/${encodeURIComponent(view.productSlug)}`
        : `/product/${encodeURIComponent(view.productId)}`;
    case "cart":
      return "/cart";
    case "checkout":
      return "/checkout";
    case "orders":
      return "/orders";
    case "order-detail": {
      let orderId = (view as any).orderNumber || view.orderId;
      // If it's a UUID, convert it to the human-readable SS- format for the URL
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(orderId)) {
        orderId = 'SS-' + orderId.slice(0, 8).toUpperCase();
      }
      return `/my-order/${encodeURIComponent(orderId)}`;
    }
    case "order-confirmation": {
      let orderId = view.orderNumber || view.orderId;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(orderId)) {
        orderId = 'SS-' + orderId.slice(0, 8).toUpperCase();
      }
      return `/my-order/${encodeURIComponent(orderId)}/confirmed`;
    }
    case "wishlist":
      return "/wishlist";
    case "compare":
      return "/compare";
    case "profile":
      return view.id ? `/profile?id=${encodeURIComponent(view.id)}` : "/profile";
    case "auth": {
      const base = "/auth";
      if (view.authMode) {
        return `${base}/${view.authMode}${view.prefilledEmail ? `?email=${encodeURIComponent(view.prefilledEmail)}` : ""}`;
      }
      return view.prefilledEmail
        ? `${base}?email=${encodeURIComponent(view.prefilledEmail)}`
        : base;
    }
    case "admin":
      return view.role?.toLowerCase() === "manager" ? "/manager" : "/admin";
    default:
      return "/";
  }
}

/**
 * Parse a browser URL path into an AppView.
 * Used on app mount and popstate to restore the correct view.
 */
export function urlToView(pathname: string, search: string): AppView {
  const qs = new URLSearchParams(search);

  // Home
  if (pathname === "/" || pathname === "") {
    return { type: "home" };
  }

  // Products listing
  if (pathname === "/products") {
    const view: AppView = { type: "products" };
    if (qs.get("search")) view.search = qs.get("search")!;
    if (qs.get("sort")) view.sort = qs.get("sort")!;
    
    // Support both 'category' and 'categoryId' for slugs and IDs
    const cat = qs.get("category") || qs.get("categoryId");
    if (cat) {
      if (cat.includes("/")) {
        const [categorySlug, productSlug] = cat.split("/");
        return { type: "product-detail", productId: "", productSlug, categorySlug };
      }
      // If it looks like a UUID, treat as ID, otherwise treat as slug
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(cat)) {
        view.categoryId = cat;
      } else {
        view.categorySlug = cat;
      }
    }
    
    if (qs.get("minPrice")) view.minPrice = parseFloat(qs.get("minPrice")!);
    if (qs.get("maxPrice")) view.maxPrice = parseFloat(qs.get("maxPrice")!);
    return view;
  }

  // Category slug shortcut: /category/[slug]
  if (pathname.startsWith("/category/")) {
    const slug = decodeURIComponent(pathname.slice("/category/".length));
    return { type: "products", categorySlug: slug };
  }

  // Product detail: /product/[slug] or /product/[id]
  if (pathname.startsWith("/product/")) {
    const segment = decodeURIComponent(pathname.slice("/product/".length));
    // If it looks like a UUID (format: 8-4-4-4-12 hex chars), treat as ID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(segment)) {
      return { type: "product-detail", productId: segment };
    }
    return { type: "product-detail", productId: "", productSlug: segment };
  }

  // Cart
  if (pathname === "/cart") return { type: "cart" };

  // Checkout
  if (pathname === "/checkout") return { type: "checkout" };

  // Orders
  if (pathname === "/orders") return { type: "orders" };

  // Order detail: /my-order/[orderId]
  if (pathname.startsWith("/my-order/")) {
    const parts = pathname.slice("/my-order/".length).split("/");
    const orderId = decodeURIComponent(parts[0]);
    if (parts[1] === "confirmed") {
      return { type: "order-confirmation", orderId, orderNumber: "" };
    }
    return { type: "order-detail", orderId };
  }

  // Wishlist
  if (pathname === "/wishlist") return { type: "wishlist" };

  // Compare
  if (pathname === "/compare") return { type: "compare" };

  // Profile
  if (pathname === "/profile") {
    const view: AppView = { type: "profile" };
    if (qs.get("id")) view.id = qs.get("id")!;
    return view;
  }

  // Auth
  if (pathname.startsWith("/auth")) {
    const view: AppView = { type: "auth", authMode: 'signin' };
    const parts = pathname.split("/");
    if (parts[2]) {
      const mode = parts[2] as any;
      if (['signin', 'signup', 'forgot-password', 'reset-password'].includes(mode)) {
        view.authMode = mode;
      }
    }
    if (qs.get("email")) view.prefilledEmail = qs.get("email")!;
    return view;
  }

  // Admin / Manager
  if (pathname === "/admin") return { type: "admin", role: "admin" };
  if (pathname === "/manager") return { type: "admin", role: "manager" };

  // Fallback to home
  return { type: "home" };
}

// Helper to parse JSON fields
export function parseImages(imagesStr: any): ProductImage[] {
  if (Array.isArray(imagesStr)) return imagesStr;
  try {
    const parsed = typeof imagesStr === 'string' ? JSON.parse(imagesStr) : imagesStr;
    if (Array.isArray(parsed)) {
      return parsed.map((item: string | ProductImage) =>
        typeof item === "string" ? { url: item, alt: "" } : item
      );
    }
    return [{ url: parsed, alt: "" }];
  } catch {
    return [{ url: String(imagesStr), alt: "" }];
  }
}

export function parseItems<T>(itemsStr: any): T[] {
  if (Array.isArray(itemsStr)) return itemsStr;
  try {
    return typeof itemsStr === 'string' ? JSON.parse(itemsStr) : [];
  } catch {
    return [];
  }
}

export function parseAddress(addressStr: any): ShippingAddress {
  if (typeof addressStr === 'object' && addressStr !== null) return addressStr;
  try {
    return typeof addressStr === 'string' ? JSON.parse(addressStr) : {
      firstName: "", lastName: "", email: "", address: "", city: "",
      state: "", zipCode: "", country: "", phone: "",
    };
  } catch {
    return {
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      phone: "",
    };
  }
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export function getDiscountPercentage(price: number, comparePrice: number): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}
