import client from './client';

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
};

export const providerApi = {
  list: () => client.get('/providers').then((r) => r.data.providers),
  create: (data) => client.post('/providers', data).then((r) => r.data.provider),
};

export const agentApi = {
  list: () => client.get('/agents').then((r) => r.data.agents),
  get: (id) => client.get(`/agents/${id}`).then((r) => r.data.agent),
  create: (data) => client.post('/agents', data).then((r) => r.data.agent),
  update: (id, data) => client.patch(`/agents/${id}`, data).then((r) => r.data.agent),
};

export const floatApi = {
  listAccounts: () => client.get('/float/accounts').then((r) => r.data.accounts),
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

export const dashboardApi = {
  summary: () => client.get('/dashboard/summary').then((r) => r.data),
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
