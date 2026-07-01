export const ENTRY_TYPES = {
  RECEIPT: 'receipt',
  PAYMENT: 'payment',
};

export const ENTRY_TYPE_VALUES = Object.values(ENTRY_TYPES);

export const isReceipt = (type) => type === ENTRY_TYPES.RECEIPT;
export const isPayment = (type) => type === ENTRY_TYPES.PAYMENT;
