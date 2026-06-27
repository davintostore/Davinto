import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useCart } from "../context/cartContext";

const useStableQuote = ({
  queryKey,
  queryFn,
  enabled,
  signature,
  retry = 1,
  scope = "cart",
}) => {
  const {
    lastCartQuote,
    lastCheckoutQuote,
    rememberCartQuote,
    rememberCheckoutQuote,
  } = useCart();

  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    retry,
  });

  const liveQuote = query.data?.quote || null;
  const getCompatibleQuote = (storedQuote) =>
    storedQuote?.signature &&
    storedQuote.signature === signature &&
    storedQuote.quote
      ? storedQuote.quote
      : null;
  const fallbackQuote =
    scope === "checkout"
      ? getCompatibleQuote(lastCheckoutQuote) ||
        getCompatibleQuote(lastCartQuote)
      : getCompatibleQuote(lastCartQuote);
  const quote = liveQuote || fallbackQuote || null;

  useEffect(() => {
    if (!liveQuote || !signature) return;

    if (scope === "checkout") {
      rememberCheckoutQuote(liveQuote, signature);
      return;
    }

    rememberCartQuote(liveQuote, signature);
  }, [liveQuote, rememberCartQuote, rememberCheckoutQuote, scope, signature]);

  return {
    ...query,
    liveQuote,
    quote,
    quoteSignature: quote ? signature : "",
    hasCurrentQuote: Boolean(quote),
    hasStableQuote: Boolean(quote),
    isQuoteUpdating: query.isFetching && Boolean(quote),
    isQuoteCalculating: query.isLoading && !quote,
  };
};

export default useStableQuote;
