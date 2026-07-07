import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { CartContext } from "./cartContext";
import { trackAddToCart } from "../utils/metaPixel";

const CART_STORAGE_KEY = "davinto_cart_items";

const readStoredCart = () => {
  if (typeof window === "undefined") return [];

  try {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  } catch {
    return [];
  }
};

const saveStoredCart = (items) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
};

const getCartItemKey = (item) => {
  return `${item.productId}__${item.color?.key || item.color?.name}__${
    item.size?.label
  }`;
};

const normalizeQuantity = (quantity, maxStock) => {
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const safeStock = Number(maxStock || 0);

  if (safeStock > 0) {
    return Math.min(safeQuantity, safeStock);
  }

  return safeQuantity;
};

export const CartProvider = ({ children }) => {
  const { t } = useTranslation("cart");
  const [items, setItems] = useState(readStoredCart);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [cartToast, setCartToast] = useState(null);
  const [lastCartQuote, setLastCartQuote] = useState(null);
  const [lastCheckoutQuote, setLastCheckoutQuote] = useState(null);
  const cartToastTimeoutRef = useRef(null);

  const dismissCartToast = useCallback(() => {
    if (cartToastTimeoutRef.current) {
      window.clearTimeout(cartToastTimeoutRef.current);
      cartToastTimeoutRef.current = null;
    }

    setCartToast(null);
  }, []);

  const showAddedToCartToast = useCallback(() => {
    if (cartToastTimeoutRef.current) {
      window.clearTimeout(cartToastTimeoutRef.current);
    }

    setCartToast({
      id: Date.now(),
      title: t("addedToCart"),
    });

    cartToastTimeoutRef.current = window.setTimeout(() => {
      setCartToast(null);
      cartToastTimeoutRef.current = null;
    }, 2000);
  }, [t]);

  useEffect(() => {
    return () => {
      if (cartToastTimeoutRef.current) {
        window.clearTimeout(cartToastTimeoutRef.current);
      }
    };
  }, []);

  const updateCart = useCallback((updater) => {
    setItems((currentItems) => {
      const nextItems =
        typeof updater === "function" ? updater(currentItems) : updater;

      saveStoredCart(nextItems);

      return nextItems;
    });
  }, []);

  const addItem = useCallback(
    (item) => {
      const key = getCartItemKey(item);
      const quantityToAdd = normalizeQuantity(item.quantity, item.maxStock);

      updateCart((currentItems) => {
        const existingItem = currentItems.find(
          (cartItem) => getCartItemKey(cartItem) === key
        );

        if (!existingItem) {
          const nextItem = {
            ...item,
            quantity: quantityToAdd,
          };

          trackAddToCart({
            productId: nextItem.productId,
            name: nextItem.name,
            category: nextItem.category?.name || nextItem.category || "",
            price: nextItem.price,
            quantity: quantityToAdd,
          });

          return [...currentItems, nextItem];
        }

        const nextQuantity = normalizeQuantity(
          Number(existingItem.quantity || 0) + quantityToAdd,
          existingItem.maxStock
        );

        trackAddToCart({
          productId: existingItem.productId,
          name: existingItem.name,
          category:
            existingItem.category?.name || existingItem.category || "",
          price: existingItem.price,
          quantity: quantityToAdd,
        });

        return currentItems.map((cartItem) =>
          getCartItemKey(cartItem) === key
            ? {
                ...cartItem,
                quantity: nextQuantity,
              }
            : cartItem
        );
      });

      showAddedToCartToast();
    },
    [showAddedToCartToast, updateCart]
  );

  const updateQuantity = useCallback(
    (key, quantity) => {
      updateCart((currentItems) =>
        currentItems
          .map((item) => {
            if (getCartItemKey(item) !== key) return item;

            return {
              ...item,
              quantity: normalizeQuantity(quantity, item.maxStock),
            };
          })
          .filter((item) => Number(item.quantity || 0) > 0)
      );
    },
    [updateCart]
  );

  const increaseQuantity = useCallback(
    (key) => {
      updateCart((currentItems) =>
        currentItems.map((item) => {
          if (getCartItemKey(item) !== key) return item;

          return {
            ...item,
            quantity: normalizeQuantity(
              Number(item.quantity || 0) + 1,
              item.maxStock
            ),
          };
        })
      );
    },
    [updateCart]
  );

  const decreaseQuantity = useCallback(
    (key) => {
      updateCart((currentItems) =>
        currentItems
          .map((item) => {
            if (getCartItemKey(item) !== key) return item;

            return {
              ...item,
              quantity: Math.max(Number(item.quantity || 1) - 1, 0),
            };
          })
          .filter((item) => Number(item.quantity || 0) > 0)
      );
    },
    [updateCart]
  );

  const removeItem = useCallback(
    (key) => {
      updateCart((currentItems) =>
        currentItems.filter((item) => getCartItemKey(item) !== key)
      );
    },
    [updateCart]
  );

  const clearCart = useCallback(() => {
    updateCart([]);
  }, [updateCart]);

  const openCartDrawer = useCallback(() => {
    setIsCartDrawerOpen(true);
  }, []);

  const closeCartDrawer = useCallback(() => {
    setIsCartDrawerOpen(false);
  }, []);

  const rememberCartQuote = useCallback((quote, signature) => {
    if (quote && signature) {
      setLastCartQuote({ quote, signature });
    }
  }, []);

  const rememberCheckoutQuote = useCallback((quote, signature) => {
    if (quote && signature) {
      setLastCheckoutQuote({ quote, signature });
    }
  }, []);

  const cartCount = useMemo(() => {
    return items.reduce((total, item) => total + Number(item.quantity || 0), 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }, [items]);

  const compareAtSubtotal = useMemo(() => {
    return items.reduce((total, item) => {
      const compareAtPrice =
        Number(item.compareAtPrice || 0) > Number(item.price || 0)
          ? Number(item.compareAtPrice || 0)
          : Number(item.price || 0);

      return total + compareAtPrice * Number(item.quantity || 0);
    }, 0);
  }, [items]);

  const savings = useMemo(() => {
    return Math.max(compareAtSubtotal - subtotal, 0);
  }, [compareAtSubtotal, subtotal]);

  const value = useMemo(
    () => ({
      items,
      cartCount,
      subtotal,
      compareAtSubtotal,
      savings,
      addItem,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      removeItem,
      clearCart,
      cartToast,
      dismissCartToast,
      isCartDrawerOpen,
      openCartDrawer,
      closeCartDrawer,
      lastCartQuote,
      lastCheckoutQuote,
      rememberCartQuote,
      rememberCheckoutQuote,
      getCartItemKey,
    }),
    [
      items,
      cartCount,
      subtotal,
      compareAtSubtotal,
      savings,
      addItem,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      removeItem,
      clearCart,
      cartToast,
      dismissCartToast,
      isCartDrawerOpen,
      openCartDrawer,
      closeCartDrawer,
      lastCartQuote,
      lastCheckoutQuote,
      rememberCartQuote,
      rememberCheckoutQuote,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
