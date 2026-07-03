export type InvoicesStackParamList = {
  InvoicesList: undefined;
  InvoiceDetail: { invoiceId: string };
};

export type WorkOrdersStackParamList = {
  WorkOrdersList: undefined;
  WorkOrderDetail: { workOrderId: string };
  CreateWorkOrder: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  VehiclesList: undefined;
  RegisterVehicle: undefined;
  VisitorsList: undefined;
  RegisterVisitor: undefined;
  VisitorDetail: { visitorId: string };
  Lease: undefined;
  BookingsList: undefined;
  AmenitiesList: undefined;
  CreateBooking: { amenityId: string; amenityName: string };
};
