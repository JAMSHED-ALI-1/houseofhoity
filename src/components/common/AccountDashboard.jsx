"use client";

import { useEffect, useMemo, useState } from "react";
import Loader from "@/components/common/Loader";
import {
  getCountries,
  getCustomerAccount,
  getCustomerCoupons,
  getCustomerInvoices,
  getCustomerProfile,
  getStates,
  saveCustomerAccount,
} from "@/services/account.service";
import {
  createCustomerAddress,
  getCustomerAddresses,
  updateCustomerAddress,
} from "@/services/customer-address.service";
import { getOrderById, getOrders } from "@/services/order.service";

const accountViews = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "addresses", label: "Addresses" },
  { id: "orders", label: "My Orders" },
  { id: "invoices", label: "Invoices" },
  { id: "coupons", label: "Coupons" },
];

const emptyAccountForm = {
  name: "",
  email: "",
  phone: "",
  mobile: "",
  street: "",
  street2: "",
  city: "",
  zip: "",
  country_id: "",
  state_id: "",
};

const emptyAddressForm = {
  name: "",
  email: "",
  phone: "",
  mobile: "",
  street: "",
  street2: "",
  city: "",
  zip: "",
  country_id: "104",
  state_id: "",
  type: "delivery",
};

function ArrowIcon({ open }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-5 transition ${open ? "rotate-180" : ""}`}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M8 10.5 3.5 6h9L8 10.5Z" />
    </svg>
  );
}

function getDisplayName(user) {
  return user?.name || user?.display_name || user?.email || user?.login || "Customer";
}

function getList(payload, key) {
  const value = payload?.[key] || payload?.result?.[key] || payload?.data?.[key];

  return Array.isArray(value) ? value : [];
}

function getObject(payload, key) {
  const value = payload?.[key] || payload?.result?.[key] || payload?.data?.[key];

  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getFirstObject(...values) {
  return values.find((value) => Object.keys(value).length > 0) || {};
}

function getFieldValue(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    return value.name || value.display_name || value.label || value.code || "";
  }

  if (value === false || value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function getIdValue(value) {
  if (Array.isArray(value)) {
    return value[0] === false || value[0] === undefined || value[0] === null ? "" : String(value[0]);
  }

  if (value && typeof value === "object") {
    return value.id === false || value.id === undefined || value.id === null ? "" : String(value.id);
  }

  if (value === false || value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function copyFields(source, fields) {
  return fields.reduce((form, field) => {
    const value = field.endsWith("_id") ? getIdValue(source?.[field]) : getFieldValue(source?.[field]);

    return {
      ...form,
      [field]: value,
    };
  }, {});
}

function formatAddress(address) {
  return [
    address.street,
    address.street2,
    address.city,
    getFieldValue(address.state),
    address.zip,
    getFieldValue(address.country),
  ]
    .filter(Boolean)
    .join(", ");
}

function getAddressLines(address = {}, prefixName = "") {
  const nameLine = [prefixName, address.name].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).join(", ");

  return [
    nameLine,
    address.street,
    address.street2,
    address.city,
    address.zip,
    getFieldValue(address.state),
    getFieldValue(address.country),
    address.phone || address.mobile,
  ].filter(Boolean);
}

function getNumberValue(...values) {
  const value = values.find((item) => item !== undefined && item !== null && item !== "");
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getOrderLines(order = {}) {
  const lines = order.order_lines || order.order_line || order.lines || order.items || order.cart?.order_lines || [];

  return Array.isArray(lines) ? lines : [];
}

function getOrderName(order = {}) {
  return order.name || order.reference || order.order_reference || `Order #${order.id || ""}`.trim();
}

function getOrderDate(order = {}) {
  const rawDate = order.date_order || order.create_date || order.confirmation_date || order.date;

  if (!rawDate) return "";

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return String(rawDate);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value, currencySymbol = "₹") {
  const amount = getNumberValue(value);

  return `${currencySymbol || "₹"}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

function getOrderCurrency(order = {}) {
  const currency = order.currency || order.currency_code || order.currency_id;

  if (Array.isArray(currency)) return currency[1] || "INR";
  if (currency && typeof currency === "object") return currency.name || currency.code || "INR";

  return currency || "INR";
}

function getOrderCurrencySymbol(order = {}) {
  return (
    order.currency_symbol ||
    order.pricelist_currency_symbol ||
    order.currency?.symbol ||
    order.pricelist?.currency_symbol ||
    (getOrderCurrency(order) === "EUR" ? "€" : "₹")
  );
}

function getLineCurrencySymbol(line = {}, order = {}) {
  return line.currency_symbol || line.product?.currency_symbol || getOrderCurrencySymbol(order);
}

function getInvoiceCurrencySymbol(invoice = {}) {
  return (
    invoice.display_currency_symbol ||
    invoice.currency_symbol ||
    invoice.currency?.symbol ||
    "₹"
  );
}

function getInvoiceAmount(invoice = {}, key = "amount_total") {
  const displayKey = `display_${key}`;

  return getNumberValue(invoice[displayKey], invoice[key]);
}

function getInvoiceName(invoice = {}) {
  return invoice.name || invoice.number || `Invoice #${invoice.id || ""}`.trim();
}

function getInvoiceDate(invoice = {}) {
  return getOrderDate({ date_order: invoice.date_invoice || invoice.date || invoice.accounting_date });
}

function getInvoiceStatus(invoice = {}) {
  if (invoice.reconciled || invoice.payment_state === "paid" || invoice.state === "paid") return "Paid";

  return invoice.state_label || getBadgeLabel(invoice.state, "Invoice");
}

function getOrderTotal(order = {}) {
  return getNumberValue(order.amount_total, order.total, order.grand_total, order.cart?.amount_total);
}

function getOrderStatus(order = {}) {
  if (order.state === "sale" && order.payment_state === "done") {
    return "Confirm";
  }

  const state = String(order.state || order.status || "").replace(/_/g, " ");

  if (!state) return "Order";

  return state
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStateLabel(value) {
  const state = String(value || "").replace(/_/g, " ");

  if (!state) return "";

  return state
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getBadgeLabel(value, fallback = "Status") {
  const state = String(value || "").toLowerCase();

  if (state === "done") return "Done";
  if (state === "paid") return "Paid";
  if (state === "sale") return "Confirm";
  if (state === "assigned") return "Ready";
  if (state === "confirmed") return "Confirmed";
  if (state === "draft") return "Draft";
  if (state === "cancel") return "Cancelled";

  return getStateLabel(value) || fallback;
}

function getDeliveryBadgeLabel(delivery = {}) {
  const state = String(delivery.state || "").toLowerCase();

  if (state === "done") return "Shipped";

  return delivery.state_label || getBadgeLabel(delivery.state, "Delivery");
}

function getOrderLineName(line = {}) {
  const name = line.product_name || line.name || line.product?.name || line.product_id?.name || "Item";

  return String(name).replace(/^\[[^\]]+\]\s*/, "");
}

function getOrderLineQuantity(line = {}) {
  return getNumberValue(line.quantity, line.product_uom_qty, line.qty, 1) || 1;
}

function getOrderLineImage(line = {}) {
  return (
    line.image ||
    line.image_url ||
    line.product?.image ||
    line.product?.image_url ||
    line.product?.default_image ||
    line.product?.full_image ||
    ""
  );
}

function getOrderLineUnitPrice(line = {}) {
  return getNumberValue(line.price_unit, line.price, line.product?.price);
}

function getOrderLineSubtotal(line = {}) {
  return getNumberValue(line.price_subtotal, line.price_total, getOrderLineUnitPrice(line) * getOrderLineQuantity(line));
}

function getOrderLineDiscount(line = {}) {
  return getNumberValue(line.discount, line.discount_percentage, line.discount_percent);
}

function getOrderTransactions(order = {}) {
  const transactions = order.transactions || order.payment_transactions || [];

  if (Array.isArray(transactions) && transactions.length > 0) return transactions;

  return order.transaction && Object.keys(order.transaction).length > 0 ? [order.transaction] : [];
}

function getOrderInvoices(order = {}) {
  return Array.isArray(order.invoices) ? order.invoices : [];
}

function getDeliveryOrders(order = {}) {
  const deliveries = order.delivery_orders || order.pickings || [];

  return Array.isArray(deliveries) ? deliveries : [];
}

function Field({ label, name, value, onChange, type = "text", required = false }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#777]">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        required={required}
        onChange={onChange}
        className="mt-1 h-10 w-full border border-[#d9d9d9] bg-white/80 px-3 text-sm font-semibold text-[#333] outline-none transition focus:border-[#6c5caf]"
      />
    </label>
  );
}

function SelectField({ label, name, value, onChange, options, placeholder = "Select", required = false }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#777]">{label}</span>
      <select
        name={name}
        value={value}
        required={required}
        onChange={onChange}
        className="mt-1 h-10 w-full border border-[#d9d9d9] bg-white/80 px-3 text-sm font-semibold text-[#333] outline-none transition focus:border-[#6c5caf]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id || option.code || option.name} value={getIdValue(option.id)}>
            {option.name || option.label || option.code}
          </option>
        ))}
      </select>
    </label>
  );
}

function DetailRows({ data, fields }) {
  const visibleFields = fields.filter(({ key }) => getFieldValue(data?.[key]));

  if (visibleFields.length === 0) {
    return <p className="text-sm font-semibold text-[#777]">No data found.</p>;
  }

  return (
    <div className="grid gap-3">
      {visibleFields.map(({ key, label }) => (
        <div key={key} className="border border-[#ece7db] bg-white/75 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#888]">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#333]">{getFieldValue(data[key])}</p>
        </div>
      ))}
    </div>
  );
}

function CouponList({ title, coupons }) {
  return (
    <div>
      <p className="text-sm font-bold text-[#333]">{title}</p>
      {coupons.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-[#777]">No coupons found.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {coupons.map((coupon, index) => (
            <div key={coupon.id || coupon.code || index} className="border border-[#ece7db] bg-white/75 p-3">
              <p className="break-words text-base font-bold text-[#333]">
                {coupon.code || coupon.name || coupon.program_name || "Coupon"}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#777]">
                {[coupon.description, coupon.discount, coupon.reward, coupon.expiration_date]
                  .map(getFieldValue)
                  .filter(Boolean)
                  .join(" | ") || "Coupon available"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountDashboard({
  user,
  authError,
  loginMessage,
  onLogout,
  isLoggingOut,
}) {
  const [activeView, setActiveView] = useState("profile");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [payloads, setPayloads] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [panelError, setPanelError] = useState("");
  const [panelMessage, setPanelMessage] = useState("");
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [includeUnpaidOrders, setIncludeUnpaidOrders] = useState(false);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
  const [invoicesRefreshKey, setInvoicesRefreshKey] = useState(0);
  const [isLoadingMoreInvoices, setIsLoadingMoreInvoices] = useState(false);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [isLoadingOrderPreview, setIsLoadingOrderPreview] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  const activeLabel = useMemo(
    () => accountViews.find((view) => view.id === activeView)?.label || "Profile",
    [activeView],
  );
  const countries = getList(payloads.countries, "countries");
  const states = getList(payloads.states, "states");
  const selectedCountryId = activeView === "account" ? accountForm.country_id : addressForm.country_id;

  useEffect(() => {
    let ignore = false;

    async function loadCountries() {
      try {
        const payload = await getCountries();

        if (!ignore) {
          setPayloads((current) => ({ ...current, countries: payload }));
        }
      } catch {
        if (!ignore) {
          setPayloads((current) => ({ ...current, countries: { countries: [] } }));
        }
      }
    }

    loadCountries();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadStates() {
      try {
        const payload = await getStates(selectedCountryId ? { country_id: selectedCountryId } : {});

        if (!ignore) {
          setPayloads((current) => ({ ...current, states: payload }));
        }
      } catch {
        if (!ignore) {
          setPayloads((current) => ({ ...current, states: { states: [] } }));
        }
      }
    }

    loadStates();

    return () => {
      ignore = true;
    };
  }, [selectedCountryId]);

  useEffect(() => {
    let ignore = false;

    async function loadView() {
      setIsLoading(true);
      setPanelError("");
      setPanelMessage("");

      try {
        const loader = {
          profile: () => getCustomerProfile(),
          account: () => getCustomerAccount(),
          addresses: () => getCustomerAddresses({}),
          orders: () => getOrders({ page: 1, limit: 10, include_unpaid: includeUnpaidOrders }),
          invoices: () => getCustomerInvoices({ page: 1, limit: 10 }),
          coupons: () => getCustomerCoupons({ limit: 100 }),
        }[activeView];
        const payload = await loader();

        if (ignore) return;

        setPayloads((current) => ({ ...current, [activeView]: payload }));

        if (activeView === "account") {
          const account = getFirstObject(getObject(payload, "account"), getObject(payload, "partner"));
          setAccountForm((current) => ({
            ...current,
            ...copyFields(account, Object.keys(emptyAccountForm)),
          }));
        }
      } catch (error) {
        if (!ignore) {
          setPanelError(error.message || "Could not load account data.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadView();

    return () => {
      ignore = true;
    };
  }, [activeView, includeUnpaidOrders, ordersRefreshKey, invoicesRefreshKey]);

  function selectView(viewId) {
    setActiveView(viewId);
    setIsMenuOpen(false);
  }

  function updateAccountForm(event) {
    const { name, value } = event.target;
    setAccountForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "country_id" ? { state_id: "" } : {}),
    }));
  }

  function updateAddressForm(event) {
    const { name, value } = event.target;
    setAddressForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "country_id" ? { state_id: "" } : {}),
    }));
  }

  async function submitAccount(event) {
    event.preventDefault();
    setIsSaving(true);
    setPanelError("");
    setPanelMessage("");

    try {
      const payload = await saveCustomerAccount(accountForm);
      setPayloads((current) => ({ ...current, account: payload }));
      setPanelMessage("Account saved.");
    } catch (error) {
      setPanelError(error.message || "Could not save account.");
    } finally {
      setIsSaving(false);
    }
  }

  function editAddress(address) {
    setEditingAddressId(address.id);
    setAddressForm({
      ...emptyAddressForm,
      ...copyFields(address, Object.keys(emptyAddressForm)),
      country_id: getIdValue(address.country_id) || emptyAddressForm.country_id,
      state_id: getIdValue(address.state_id),
      type: address.type || "delivery",
    });
  }

  async function submitAddress(event) {
    event.preventDefault();
    setIsSaving(true);
    setPanelError("");
    setPanelMessage("");

    try {
      const addresses = getList(payloads.addresses, "addresses");
      const createPayload = addresses.length > 0
        ? { ...addressForm, add_another_address: true }
        : addressForm;
      const payload = editingAddressId
        ? await updateCustomerAddress({ ...addressForm, address_id: editingAddressId })
        : await createCustomerAddress(createPayload);
      const listPayload = await getCustomerAddresses({});

      setPayloads((current) => ({ ...current, addresses: listPayload }));
      setAddressForm(emptyAddressForm);
      setEditingAddressId("");
      setPanelMessage(payload?.message === "success" ? "Address saved." : "Address updated.");
    } catch (error) {
      setPanelError(error.message || "Could not save address.");
    } finally {
      setIsSaving(false);
    }
  }

  async function loadMoreOrders() {
    const ordersPayload = payloads.orders || {};
    const page = Number(ordersPayload.page || 1);
    const totalPages = Number(ordersPayload.total_pages || 1);

    if (page >= totalPages || isLoadingMoreOrders) return;

    setIsLoadingMoreOrders(true);
    setPanelError("");

    try {
      const nextPayload = await getOrders({
        page: page + 1,
        limit: Number(ordersPayload.limit || 10),
        include_unpaid: includeUnpaidOrders,
      });
      const currentOrders = getList(ordersPayload, "orders");
      const nextOrders = getList(nextPayload, "orders");

      setPayloads((current) => ({
        ...current,
        orders: {
          ...nextPayload,
          orders: [...currentOrders, ...nextOrders],
        },
      }));
    } catch (error) {
      setPanelError(error.message || "Could not load more orders.");
    } finally {
      setIsLoadingMoreOrders(false);
    }
  }

  async function loadMoreInvoices() {
    const invoicesPayload = payloads.invoices || {};
    const page = Number(invoicesPayload.page || 1);
    const totalPages = Number(invoicesPayload.total_pages || 1);

    if (page >= totalPages || isLoadingMoreInvoices) return;

    setIsLoadingMoreInvoices(true);
    setPanelError("");

    try {
      const nextPayload = await getCustomerInvoices({
        page: page + 1,
        limit: Number(invoicesPayload.limit || 10),
      });
      const currentInvoices = getList(invoicesPayload, "invoices");
      const nextInvoices = getList(nextPayload, "invoices");

      setPayloads((current) => ({
        ...current,
        invoices: {
          ...nextPayload,
          invoices: [...currentInvoices, ...nextInvoices],
        },
      }));
    } catch (error) {
      setPanelError(error.message || "Could not load more invoices.");
    } finally {
      setIsLoadingMoreInvoices(false);
    }
  }

  async function openOrderPreview(order) {
    setPreviewOrder(order);
    setIsTrackingOpen(false);

    if (!order?.id) return;

    setIsLoadingOrderPreview(true);
    setPanelError("");

    try {
      const payload = await getOrderById(order.id);
      const orderObject = getObject(payload, "order");
      const nextOrder = Object.keys(orderObject).length > 0 ? orderObject : payload.order || order;

      setPreviewOrder(Object.keys(nextOrder).length > 0 ? nextOrder : order);
    } catch (error) {
      setPanelError(error.message || "Could not load order preview.");
    } finally {
      setIsLoadingOrderPreview(false);
    }
  }

  function renderProfile() {
    const partner = getObject(payloads.profile, "partner");

    return (
      <DetailRows
        data={partner}
        fields={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "mobile", label: "Mobile" },
          { key: "street", label: "Street" },
          { key: "city", label: "City" },
          { key: "zip", label: "Pincode" },
          { key: "country", label: "Country" },
        ]}
      />
    );
  }

  function renderAccount() {
    return (
      <form className="grid gap-3" onSubmit={submitAccount}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name" name="name" value={accountForm.name} onChange={updateAccountForm} required />
          <Field label="Email" name="email" type="email" value={accountForm.email} onChange={updateAccountForm} required />
          <Field label="Phone" name="phone" value={accountForm.phone} onChange={updateAccountForm} />
          <Field label="Mobile" name="mobile" value={accountForm.mobile} onChange={updateAccountForm} />
          <Field label="City" name="city" value={accountForm.city} onChange={updateAccountForm} />
          <Field label="Pincode" name="zip" value={accountForm.zip} onChange={updateAccountForm} />
          <SelectField
            label="Country"
            name="country_id"
            value={accountForm.country_id}
            onChange={updateAccountForm}
            options={countries}
            placeholder="Select country"
          />
          <SelectField
            label="State"
            name="state_id"
            value={accountForm.state_id}
            onChange={updateAccountForm}
            options={states}
            placeholder="Select state"
          />
        </div>
        <Field label="Street" name="street" value={accountForm.street} onChange={updateAccountForm} />
        <Field label="Street 2" name="street2" value={accountForm.street2} onChange={updateAccountForm} />
        <button
          type="submit"
          disabled={isSaving}
          className="min-h-11 border border-[#6c5caf] bg-[#6c5caf] px-4 text-sm font-bold text-white transition hover:bg-[#554596] disabled:cursor-not-allowed disabled:bg-[#aaa]"
        >
          {isSaving ? (
            <Loader variant="dots" size={46} label="Saving account" className="brightness-0 invert" />
          ) : "Save Account"}
        </button>
      </form>
    );
  }

  function renderAddresses() {
    const addresses = getList(payloads.addresses, "addresses");

    return (
      <div className="grid gap-5">
        <div className="grid gap-3">
          {addresses.length === 0 ? (
            <p className="text-sm font-semibold text-[#777]">No saved addresses.</p>
          ) : (
            addresses.map((address) => (
              <div key={address.id} className="border border-[#ece7db] bg-white/75 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#333]">{address.name || "Address"}</p>
                    <p className="mt-1 text-sm leading-6 text-[#666]">{formatAddress(address)}</p>
                    <p className="mt-1 break-words text-xs font-semibold text-[#777]">
                      {[address.email, address.phone || address.mobile].filter(Boolean).join(" | ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => editAddress(address)}
                    className="shrink-0 border border-[#d9d9d9] bg-white px-3 py-2 text-xs font-bold text-[#333] transition hover:border-[#6c5caf] hover:text-[#6c5caf]"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form className="grid gap-3 border border-[#e8dfd0] bg-white/55 p-4" onSubmit={submitAddress}>
          <p className="text-sm font-bold text-[#333]">{editingAddressId ? "Update address" : "Add address"}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name" name="name" value={addressForm.name} onChange={updateAddressForm} required />
            <Field label="Email" name="email" type="email" value={addressForm.email} onChange={updateAddressForm} />
            <Field label="Phone" name="phone" value={addressForm.phone} onChange={updateAddressForm} />
            <Field label="Mobile" name="mobile" value={addressForm.mobile} onChange={updateAddressForm} />
            <Field label="City" name="city" value={addressForm.city} onChange={updateAddressForm} required />
            <Field label="Pincode" name="zip" value={addressForm.zip} onChange={updateAddressForm} />
            <SelectField
              label="Country"
              name="country_id"
              value={addressForm.country_id}
              onChange={updateAddressForm}
              options={countries}
              placeholder="Select country"
            />
            <SelectField
              label="State"
              name="state_id"
              value={addressForm.state_id}
              onChange={updateAddressForm}
              options={states}
              placeholder="Select state"
            />
          </div>
          <Field label="Street" name="street" value={addressForm.street} onChange={updateAddressForm} required />
          <Field label="Street 2" name="street2" value={addressForm.street2} onChange={updateAddressForm} />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-11 border border-[#6c5caf] bg-[#6c5caf] px-4 text-sm font-bold text-white transition hover:bg-[#554596] disabled:cursor-not-allowed disabled:bg-[#aaa]"
            >
              {isSaving ? (
                <Loader variant="dots" size={46} label="Saving address" className="brightness-0 invert" />
              ) : "Save Address"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingAddressId("");
                setAddressForm(emptyAddressForm);
              }}
              className="min-h-11 border border-[#d9d9d9] bg-white px-4 text-sm font-bold text-[#444] transition hover:border-[#6c5caf] hover:text-[#6c5caf]"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderCoupons() {
    return (
      <div className="grid gap-5">
        <CouponList title="My coupons" coupons={getList(payloads.coupons, "my_coupons")} />
        <CouponList title="Available coupons" coupons={getList(payloads.coupons, "available_coupons")} />
      </div>
    );
  }

  function renderInvoices() {
    const invoicesPayload = payloads.invoices || {};
    const invoices = getList(invoicesPayload, "invoices");
    const page = Number(invoicesPayload.page || 1);
    const totalPages = Number(invoicesPayload.total_pages || 1);
    const total = Number(invoicesPayload.total || invoices.length);

    return (
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 border border-[#ece7db] bg-white/65 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#333]">Invoice history</p>
            <p className="mt-1 text-xs font-semibold text-[#777]">
              {total > 0 ? `${total} invoice${total === 1 ? "" : "s"} found` : "No invoices yet"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInvoicesRefreshKey((current) => current + 1)}
            className="min-h-9 border border-[#d9d9d9] bg-white px-3 text-xs font-bold text-[#333] transition hover:border-[#6c5caf] hover:text-[#6c5caf]"
          >
            Refresh
          </button>
        </div>

        {invoices.length === 0 ? (
          <div className="border border-[#ece7db] bg-white/75 p-6 text-center">
            <p className="text-base font-bold text-[#333]">No invoices found</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#777]">
              Your invoices will appear here after an order is invoiced.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {invoices.map((invoice, index) => {
              const currencySymbol = getInvoiceCurrencySymbol(invoice);
              const viewUrl = invoice.absolute_url || invoice.url;
              const downloadUrl = invoice.download_absolute_url || invoice.pdf_absolute_url || invoice.download_url || invoice.pdf_url;

              return (
                <article key={invoice.id || invoice.name || index} className="border border-[#e6ddcf] bg-white/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-base font-black text-[#333]">{getInvoiceName(invoice)}</p>
                        <span className="border border-[#d8d0c8] bg-[#fbf8f3] px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#6c5caf]">
                          {getInvoiceStatus(invoice)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#888]">
                        {getInvoiceDate(invoice) || "Date unavailable"}
                      </p>
                      {(invoice.sale_order || invoice.origin || invoice.reference) && (
                        <p className="mt-2 break-words text-sm font-semibold text-[#666]">
                          {[invoice.sale_order || invoice.origin, invoice.reference].filter(Boolean).join(" | ")}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#888]">Total</p>
                      <p className="mt-1 text-lg font-black text-[#333]">
                        {formatMoney(getInvoiceAmount(invoice, "amount_total"), currencySymbol)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#eee3d4] pt-3 text-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#888]">Untaxed</p>
                      <p className="mt-1 text-xs font-bold text-[#333]">{formatMoney(getInvoiceAmount(invoice, "amount_untaxed"), currencySymbol)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#888]">Tax</p>
                      <p className="mt-1 text-xs font-bold text-[#333]">{formatMoney(getInvoiceAmount(invoice, "amount_tax"), currencySymbol)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#888]">Due</p>
                      <p className="mt-1 text-xs font-bold text-[#333]">{formatMoney(getInvoiceAmount(invoice, "amount_due"), currencySymbol)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {viewUrl && (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-10 flex-1 items-center justify-center border border-[#6c5caf] bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-[#6c5caf] transition hover:bg-[#6c5caf] hover:text-white"
                      >
                        View
                      </a>
                    )}
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-10 flex-1 items-center justify-center bg-[#222] px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#6c5caf]"
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {page < totalPages && (
          <button
            type="button"
            onClick={loadMoreInvoices}
            disabled={isLoadingMoreInvoices}
            className="min-h-11 border border-[#d9d9d9] bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-[#333] transition hover:border-[#6c5caf] hover:text-[#6c5caf] disabled:cursor-not-allowed disabled:text-[#999]"
          >
            {isLoadingMoreInvoices ? (
              <Loader variant="dots" size={46} label="Loading more invoices" />
            ) : `Load more (${page}/${totalPages})`}
          </button>
        )}
      </div>
    );
  }

  function renderOrderPreview() {
    if (!previewOrder) return null;

    const lines = getOrderLines(previewOrder).filter((line) => getOrderLineName(line));
    const currencySymbol = getOrderCurrencySymbol(previewOrder);
    const billingAddress = previewOrder.billing_address || previewOrder.invoice_address || previewOrder.partner || {};
    const shippingAddress = previewOrder.shipping_address || previewOrder.delivery_address || previewOrder.partner || {};
    const transactions = getOrderTransactions(previewOrder);
    const invoices = getOrderInvoices(previewOrder);
    const deliveryOrders = getDeliveryOrders(previewOrder);

    return (
      <div className="fixed inset-0 z-[10001] bg-black/55 px-3 py-4">
        <button
          type="button"
          className="absolute inset-0"
          onClick={() => setPreviewOrder(null)}
          aria-label="Close order preview"
        />
        <div className="relative mx-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl">
          <div className="flex min-h-14 items-center justify-between border-b border-[#e5e5e5] px-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#777]">Sales Orders / {getOrderName(previewOrder)}</p>
              <h3 className="mt-1 break-words text-lg font-bold text-[#333]">{getOrderName(previewOrder)}</h3>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOrder(null)}
              className="grid size-10 shrink-0 place-items-center border border-[#ddd] text-xl leading-none"
              aria-label="Close order preview"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto p-4">
            {isLoadingOrderPreview && (
              <div className="mb-4 flex items-center gap-3 border border-[#eee] bg-[#fafafa] px-4 py-3 text-sm font-semibold text-[#666]">
                <Loader variant="dots" size={42} label="Loading order preview" />
                Loading latest order details...
              </div>
            )}

            <div className="border border-[#d8d8d8]">
              <div className="flex flex-col gap-3 border-b border-[#e5e5e5] bg-[#fafafa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-base font-semibold text-[#444]">Order {getOrderName(previewOrder)}</p>
                  <span className="bg-[#34c759] px-2 py-1 text-[11px] font-black text-white">
                    {getOrderStatus(previewOrder)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTrackingOpen((current) => !current)}
                    className="min-h-9 bg-[#6c35a8] px-4 text-xs font-bold text-white transition hover:bg-[#552985]"
                  >
                    Track your Order
                  </button>
                  {/* {(previewOrder.download_absolute_url || previewOrder.report_absolute_url) && (
                    <a
                      href={previewOrder.download_absolute_url || previewOrder.report_absolute_url}
                      target="_blank"
                      rel="noreferrer"
                      className="grid min-h-9 place-items-center border border-[#d8d8d8] bg-white px-3 text-xs font-black text-[#3b6db5] transition hover:border-[#3b6db5]"
                    >
                      Download
                    </a>
                  )} */}
                </div>
              </div>

              {isTrackingOpen && (
                <div className="border-b border-[#e5e5e5] bg-[#fbfbfb] px-4 py-4">
                  <p className="text-sm font-black text-[#333]">Tracking Status</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    {[
                      ["Order", getOrderStatus(previewOrder), getOrderDate(previewOrder)],
                      ["Payment", previewOrder.is_paid ? "Paid" : getBadgeLabel(previewOrder.payment_state, "Pending"), transactions[0]?.reference || ""],
                      ["Invoice", invoices[0] ? getBadgeLabel(invoices[0].state, "Invoice") : "Not generated", invoices[0]?.name || ""],
                      ["Delivery", deliveryOrders[0] ? getDeliveryBadgeLabel(deliveryOrders[0]) : "Not shipped", deliveryOrders[0]?.name || previewOrder.carrier || ""],
                    ].map(([label, status, meta]) => (
                      <div key={label} className="border border-[#e5e5e5] bg-white p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#888]">{label}</p>
                        <p className="mt-1 text-sm font-black text-[#333]">{status}</p>
                        {meta && <p className="mt-1 break-words text-xs font-semibold text-[#777]">{meta}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-6 px-4 py-4 text-sm text-[#666] md:grid-cols-2">
                <div>
                  <p><span className="font-bold text-[#555]">Date:</span> {getOrderDate(previewOrder) || "Not available"}</p>
                  <div className="mt-4">
                    <p className="font-bold text-[#555]">Invoicing Address</p>
                    <div className="mt-1 leading-6">
                      {getAddressLines(billingAddress, previewOrder.partner?.name).map((line, index) => (
                        <p key={`${line}-${index}`}>{line}</p>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="font-bold text-[#555]">Transactions</p>
                    {transactions.length === 0 ? (
                      <p className="mt-1 text-xs font-semibold text-[#999]">No transactions returned</p>
                    ) : transactions.map((transaction) => (
                      <p key={transaction.id || transaction.reference} className="mt-1 text-xs font-semibold text-[#777]">
                        {[transaction.reference || transaction.provider || "Transaction", getOrderDate({ date_order: transaction.date })]
                          .filter(Boolean)
                          .join(" / ")}
                        <span className="ml-2 bg-[#34c759] px-2 py-1 text-[10px] font-black text-white">
                          {getBadgeLabel(transaction.state, "Transaction")}
                        </span>
                      </p>
                    ))}
                    <p className="mt-2 font-bold text-[#555]">Invoices</p>
                    {invoices.length === 0 ? (
                      <p className="mt-1 text-xs font-semibold text-[#999]">No invoices returned</p>
                    ) : invoices.map((invoice) => (
                      <p key={invoice.id || invoice.name} className="mt-1 text-xs font-semibold text-[#777]">
                        {invoice.name || invoice.number || "Invoice"} {invoice.date || ""}
                        <span className="ml-2 bg-[#34c759] px-2 py-1 text-[10px] font-black text-white">
                          {getBadgeLabel(invoice.state, "Invoice")}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-[#555]">Shipping Address</p>
                  <div className="mt-1 leading-6">
                    {getAddressLines(shippingAddress, previewOrder.partner?.name).map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))}
                  </div>
                  <div className="mt-5">
                    <p className="font-bold text-[#555]">Delivery Orders</p>
                    {deliveryOrders.length === 0 ? (
                      <p className="mt-1 text-xs font-semibold text-[#999]">No delivery orders returned</p>
                    ) : deliveryOrders.map((delivery) => (
                      <p key={delivery.id || delivery.name} className="mt-1 text-xs font-semibold text-[#777]">
                        {delivery.name || previewOrder.carrier || "Delivery"}
                        {delivery.scheduled_date ? ` ${getOrderDate({ date_order: delivery.scheduled_date })}` : ""}
                        <span className="ml-2 bg-[#34c759] px-2 py-1 text-[10px] font-black text-white">
                          {getDeliveryBadgeLabel(delivery)}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto px-4 pb-4">
                <table className="w-full min-w-[720px] border-t border-[#d8d8d8] text-sm">
                  <thead>
                    <tr className="text-left text-xs font-black uppercase tracking-[0.06em] text-[#666]">
                      <th className="py-3 pr-4">Product</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4 text-right">Discount</th>
                      <th className="py-3 pl-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center font-semibold text-[#777]">No product lines returned.</td>
                      </tr>
                    ) : (
                      lines.map((line, index) => {
                        const image = getOrderLineImage(line);

                        return (
                          <tr key={line.id || line.line_id || index} className="border-t border-[#eeeeee]">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="grid size-14 shrink-0 place-items-center overflow-hidden border border-[#e5e5e5] bg-[#f8f8f8]">
                                  {image ? (
                                    <img src={image} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-[10px] font-bold text-[#aaa]">No image</span>
                                  )}
                                </div>
                                <span className="min-w-0 break-words font-semibold text-[#666]">{getOrderLineName(line)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-[#666]">
                              {formatMoney(getOrderLineUnitPrice(line), getLineCurrencySymbol(line, previewOrder))}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-[#666]">
                              {getOrderLineQuantity(line)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-[#666]">
                              {getOrderLineDiscount(line).toFixed(2)} %
                            </td>
                            <td className="py-3 pl-4 text-right font-semibold text-[#666]">
                              {formatMoney(getOrderLineSubtotal(line), getLineCurrencySymbol(line, previewOrder))}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-[#e5e5e5] bg-[#fafafa] px-4 py-4">
                <div className="ml-auto grid max-w-sm gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-[#666]">Subtotal</span>
                    <span className="font-bold text-[#333]">{formatMoney(previewOrder.amount_untaxed, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-[#666]">Taxes</span>
                    <span className="font-bold text-[#333]">{formatMoney(previewOrder.amount_tax, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-[#ddd] pt-2 text-base">
                    <span className="font-black text-[#333]">Total</span>
                    <span className="font-black text-[#333]">{formatMoney(getOrderTotal(previewOrder), currencySymbol)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderOrders() {
    const ordersPayload = payloads.orders || {};
    const orders = getList(ordersPayload, "orders");
    const page = Number(ordersPayload.page || 1);
    const totalPages = Number(ordersPayload.total_pages || 1);
    const total = Number(ordersPayload.total || orders.length);

    return (
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 border border-[#ece7db] bg-white/65 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#333]">Order history</p>
            <p className="mt-1 text-xs font-semibold text-[#777]">
              {total > 0 ? `${total} order${total === 1 ? "" : "s"} found` : "No completed orders yet"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-9 items-center gap-2 border border-[#d9d9d9] bg-white px-3 text-xs font-bold text-[#444]">
              <input
                type="checkbox"
                checked={includeUnpaidOrders}
                onChange={(event) => setIncludeUnpaidOrders(event.target.checked)}
                className="size-4 accent-[#6c5caf]"
              />
              Include unpaid
            </label>
            <button
              type="button"
              onClick={() => setOrdersRefreshKey((current) => current + 1)}
              className="min-h-9 border border-[#d9d9d9] bg-white px-3 text-xs font-bold text-[#333] transition hover:border-[#6c5caf] hover:text-[#6c5caf]"
            >
              Refresh
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="border border-[#ece7db] bg-white/75 p-6 text-center">
            <p className="text-base font-bold text-[#333]">No orders found</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#777]">
              Your confirmed orders will appear here after checkout.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((order, index) => {
              const lines = getOrderLines(order).filter((line) => getOrderLineName(line));
              const visibleLines = lines.slice(0, 3);
              const currencySymbol = getOrderCurrencySymbol(order);

              return (
                <article key={order.id || order.name || index} className="border border-[#e6ddcf] bg-white/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-base font-black text-[#333]">{getOrderName(order)}</p>
                        <span className="border border-[#d8d0c8] bg-[#fbf8f3] px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#6c5caf]">
                          {getOrderStatus(order)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#888]">
                        {getOrderDate(order) || "Date unavailable"}
                      </p>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#888]">Total</p>
                      <p className="mt-1 text-lg font-black text-[#333]">{formatMoney(getOrderTotal(order), currencySymbol)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {visibleLines.length === 0 ? (
                      <p className="text-sm font-semibold text-[#777]">No item details returned.</p>
                    ) : (
                      visibleLines.map((line, lineIndex) => (
                        <div key={line.id || line.line_id || lineIndex} className="flex items-center justify-between gap-3 border border-[#f0eadf] bg-white/70 px-3 py-2">
                          <p className="min-w-0 break-words text-sm font-bold text-[#444]">{getOrderLineName(line)}</p>
                          <p className="shrink-0 text-xs font-black uppercase tracking-[0.08em] text-[#777]">
                            Qty {getOrderLineQuantity(line)}
                          </p>
                        </div>
                      ))
                    )}
                    {lines.length > visibleLines.length && (
                      <p className="text-xs font-semibold text-[#777]">
                        +{lines.length - visibleLines.length} more item{lines.length - visibleLines.length === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#eee3d4] pt-3 text-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#888]">Subtotal</p>
                      <p className="mt-1 text-xs font-bold text-[#333]">
                        {formatMoney(getNumberValue(order.amount_untaxed, order.subtotal), currencySymbol)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#888]">Tax</p>
                      <p className="mt-1 text-xs font-bold text-[#333]">
                        {formatMoney(getNumberValue(order.amount_tax, order.tax), currencySymbol)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#888]">Items</p>
                      <p className="mt-1 text-xs font-bold text-[#333]">
                        {getNumberValue(order.cart_quantity, order.quantity, lines.length)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openOrderPreview(order)}
                    className="mt-4 min-h-10 w-full border border-[#6c5caf] bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-[#6c5caf] transition hover:bg-[#6c5caf] hover:text-white"
                  >
                    Preview
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {page < totalPages && (
          <button
            type="button"
            onClick={loadMoreOrders}
            disabled={isLoadingMoreOrders}
            className="min-h-11 border border-[#6c5caf] bg-white px-4 text-sm font-bold text-[#6c5caf] transition hover:bg-[#6c5caf] hover:text-white disabled:cursor-not-allowed disabled:border-[#bbb] disabled:text-[#999]"
          >
            {isLoadingMoreOrders ? (
              <Loader variant="dots" size={46} label="Loading more orders" />
            ) : `Load more (${page}/${totalPages})`}
          </button>
        )}
      </div>
    );
  }

  function renderPanel() {
    if (isLoading) {
      return (
        <div className="grid place-items-center py-8">
          <Loader variant="dots" size={74} label={`Loading ${activeLabel.toLowerCase()}`} />
        </div>
      );
    }

    if (activeView === "profile") return renderProfile();
    if (activeView === "account") return renderAccount();
    if (activeView === "addresses") return renderAddresses();
    if (activeView === "orders") return renderOrders();
    if (activeView === "invoices") return renderInvoices();
    if (activeView === "coupons") return renderCoupons();

    return null;
  }

  return (
    <div className="mt-10">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-4 border border-white/70 bg-white/75 p-5 text-left shadow-[0_12px_26px_rgba(0,0,0,0.08)] transition hover:border-[#6c5caf]"
          aria-expanded={isMenuOpen}
        >
          <span>
            <span className="block text-sm font-bold uppercase tracking-[0.08em] text-[#777]">Signed in</span>
            <span className="mt-1 block break-words text-2xl font-semibold text-[#333]">{getDisplayName(user)}</span>
            {(user?.email || user?.login) && (
              <span className="mt-1 block break-words text-sm font-semibold text-[#666]">
                {user.email || user.login}
              </span>
            )}
          </span>
          <span className="grid size-10 shrink-0 place-items-center border border-[#d8d8d8] bg-white text-[#333]">
            <ArrowIcon open={isMenuOpen} />
          </span>
        </button>

        {isMenuOpen && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 border border-[#dfd7ca] bg-white shadow-[0_18px_34px_rgba(0,0,0,0.14)]">
            {accountViews.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => selectView(view.id)}
                className={`flex min-h-11 w-full items-center justify-between px-4 text-left text-sm font-bold transition ${
                  activeView === view.id
                    ? "bg-[#6c5caf] text-white"
                    : "bg-white text-[#333] hover:bg-[#f7f2ea]"
                }`}
              >
                {view.label}
                <span aria-hidden="true">&gt;</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 border border-white/70 bg-white/72 p-5 shadow-[0_12px_26px_rgba(0,0,0,0.08)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-lg font-bold text-[#333]">{activeLabel}</p>
        </div>
        {panelError && <p className="mb-3 text-sm font-bold text-red-600">{panelError}</p>}
        {panelMessage && <p className="mb-3 text-sm font-bold text-[#267341]">{panelMessage}</p>}
        {renderPanel()}
      </div>
      {renderOrderPreview()}

      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className="mt-6 flex min-h-13 w-full items-center justify-center border border-[#6c5caf] bg-white/75 px-8 text-xl font-semibold text-[#6c5caf] shadow-[0_14px_30px_rgba(80,65,145,0.12)] transition hover:bg-[#6c5caf] hover:text-white disabled:cursor-not-allowed disabled:border-[#bbb] disabled:text-[#999]"
      >
        {isLoggingOut ? (
          <Loader variant="dots" size={52} label="Logging out" />
        ) : "Log out"}
      </button>
      {(loginMessage || authError) && (
        <p className="mt-4 text-sm font-semibold text-[#6c5caf]">
          {loginMessage || authError?.message}
        </p>
      )}
    </div>
  );
}
