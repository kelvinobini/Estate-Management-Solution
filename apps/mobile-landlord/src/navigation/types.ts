export type PropertiesStackParamList = {
  PropertiesList: undefined;
  PropertyDetail: { propertyId: string };
};

export type InvoicesStackParamList = {
  InvoicesList: undefined;
  InvoiceDetail: { invoiceId: string };
};

export type LeasesStackParamList = {
  LeasesList: undefined;
  LeaseDetail: { leaseId: string; tenantName: string | null; unitCode: string; propertyName: string };
};

export type WorkOrdersStackParamList = {
  WorkOrdersList: undefined;
  WorkOrderDetail: { workOrderId: string };
};
