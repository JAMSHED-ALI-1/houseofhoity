export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/customer/login",
    REGISTER: "/api/customer/register",
    REACTIVATE: "/api/account/reactivate",
    LOGOUT: "/api/logout",
    PROFILE: "/api/customer/profile",
    FORGOT_PASSWORD: "auth/forgot-password",
    RESET_PASSWORD: "auth/reset-password",
  },
  CART: {
    ROOT: "/api/cart",
    ADD: "/api/cart/add",
    UPDATE: "/api/cart/update",
    REMOVE: "/api/cart/remove",
    CLEAR: "/api/cart/clear",
    TAXES: "/api/cart/taxes",
    APPLY_COUPON: "/api/cart/apply-coupon",
  },
  WISHLIST: {
    ROOT: "/api/wishlist",
    ADD: "/api/wishlist/add",
    REMOVE: "/api/wishlist/remove",
  },
  CATEGORIES: {
    ROOT: "/api/categories",
    BY_ID: (id) => `categories/${id}`,
  },
  SLIDERS:{
    ROOT: "/api/sliders",
  },
  ORDERS: {
    ROOT: "/api/order/create",
    LIST: "/api/order/list",
    BY_ID: (id) => `/api/order/${id}`,
  },
  CUSTOMER: {
    PROFILE: "/api/customer/profile",
    ACCOUNT: "/api/my-account",
    COUPONS: "/api/my-coupons",
    INVOICES: "/api/my/invoices",
    COUNTRIES: "/api/countries",
    STATES: "/api/states",
    ADDRESSES: {
      LIST: "/api/customer/address/list",
      CREATE: "/api/customer/address/create",
      UPDATE: "/api/customer/address/update",
    },
  },
  PAYMENTS: {
    GATEWAYS: "/api/payment/gateways",
    TRANSACTION: "/api/payment/transaction",
    VALIDATE: "/api/payment/validate",
  },
  DELIVERY: {
    METHODS: "/api/delivery/methods",
    CARRIERS: "/api/delivery/carriers",
    APPLY: "/api/delivery/apply",
    SELECT: "/api/delivery/select",
  },
  PRODUCTS: {
    ROOT: "/api/products",
    DATA: "/api/products",
    SEARCH: "/api/products/search",
    CARE_INSTRUCTIONS: "/api/products/care-instructions",
    BY_CATEGORY: "/api/products/by-category",
    BY_ID: (id) => `/api/products/${id}`,
  },
  SUPPORT: {
    CARE_INSTRUCTIONS: "/api/care-instructions",
    CUSTOM_MEASURES: "/api/custom-measures/options",
  },
  SITE: {
    INFO: "/api/site-info",
  },
  USERS: {
    PROFILE: "users/profile",
    UPDATE_PROFILE: "users/profile",
    ADDRESSES: "users/addresses",
  },
};
