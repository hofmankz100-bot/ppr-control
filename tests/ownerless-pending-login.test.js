const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../modules/device-cache-policy');

function memoryStorage() {
  const entries = new Map();
  return {
    getItem: key => entries.get(key) || null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key)
  };
}

test('corrupt pending owner marker cannot permanently lock employee login', () => {
  const store = memoryStorage();
  const pending = policy.createPendingStateOwner(store, 'ppr-pwa-state-v3');
  const user = { id: 'employee-1', employeeId: '1001', name: 'Employee', role: 'mechanic', approved: true };

  store.setItem('ppr-pwa-state-v3-pending', '1');
  store.setItem('ppr-pwa-state-v3-pending-owner-v1', JSON.stringify({ ownerId: '', ownerEmployeeId: '', ownerName: '' }));

  assert.equal(pending.owner(), null);
  assert.equal(pending.reconcile(user, null), true);
  assert.equal(pending.owns(user), false, 'unknown pending work must not be attributed to the new login');
  assert.equal(store.getItem('ppr-pwa-state-v3-pending'), '1', 'pending data is retained for later recovery');
});
