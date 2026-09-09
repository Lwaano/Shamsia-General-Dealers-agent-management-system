import client from './client';

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
};

export const branchApi = {
  list: () => client.get('/branches').then((r) => r.data.branches),
  create: (data) => client.post('/branches', data).then((r) => r.data.branch),
  update: (id, data) => client.patch(`/branches/${id}`, data).then((r) => r.data.branch),
};

export const providerApi = {
  list: () => client.get('/providers').then((r) => r.data.providers),
  create: (data) => client.post('/providers', data).then((r) => r.data.provider),
};

export const agentApi = {
  list: (params) => client.get('/agents', { params }).then((r) => r.data.agents),
  get: (id) => client.get(`/agents/${id}`).then((r) => r.data.agent),
  create: (data) => client.post('/agents', data).then((r) => r.data.agent),
  update: (id, data) => client.patch(`/agents/${id}`, data).then((r) => r.data.agent),
};

export const floatApi = {
  listAccounts: (params) => client.get('/float/accounts', { params }).then((r) => r.data.accounts),
  listTransactions: (params) => client.get('/float/transactions', { params }).then((r) => r.data.transactions),
  create: (data) => client.post('/float/transactions', data).then((r) => r.data.transaction),
};

export const transactionApi = {
  list: (params) => client.get('/transactions', { params }).then((r) => r.data.transactions),
  create: (data) => client.post('/transactions', data).then((r) => r.data.transaction),
};

export const inventoryApi = {
  listItems: () => client.get('/inventory/items').then((r) => r.data.items),
  listCategories: () => client.get('/inventory/categories').then((r) => r.data.categories),
  createCategory: (data) => client.post('/inventory/categories', data).then((r) => r.data.category),
  createItem: (data) => client.post('/inventory/items', data).then((r) => r.data.item),
  updateItem: (id, data) => client.patch(`/inventory/items/${id}`, data).then((r) => r.data.item),
  listTransactions: (params) => client.get('/inventory/transactions', { params }).then((r) => r.data.transactions),
  createTransaction: (data) => client.post('/inventory/transactions', data).then((r) => r.data.transaction),
};

export const reconciliationApi = {
  list: (params) => client.get('/reconciliations', { params }).then((r) => r.data.reconciliations),
  get: (id) => client.get(`/reconciliations/${id}`).then((r) => r.data),
  open: (data) => client.post('/reconciliations/open', data).then((r) => r.data.reconciliation),
  close: (id, data) => client.post(`/reconciliations/${id}/close`, data).then((r) => r.data.reconciliation),
};

export const dashboardApi = {
  summary: (params) => client.get('/dashboard/summary', { params }).then((r) => r.data),
};

export const reportApi = {
  transactions: (params) => client.get('/reports/transactions', { params }).then((r) => r.data),
  float: (params) => client.get('/reports/float', { params }).then((r) => r.data),
  inventory: (params) => client.get('/reports/inventory', { params }).then((r) => r.data),
};

export const userApi = {
  list: () => client.get('/users').then((r) => r.data.users),
  create: (data) => client.post('/users', data).then((r) => r.data.user),
  update: (id, data) => client.patch(`/users/${id}`, data).then((r) => r.data.user),
};

export const auditApi = {
  list: (params) => client.get('/audit-log', { params }).then((r) => r.data.logs),
};
