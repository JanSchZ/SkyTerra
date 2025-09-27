export const formatPrice = (price) => {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}K`;
  }
  return `$${price?.toLocaleString()}`;
};

export const formatRentPrice = (price) => {
  if (!price) return 'Precio no disponible';
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M/mes`;
  } else if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}K/mes`;
  }
  return `$${price?.toLocaleString()}/mes`;
};
