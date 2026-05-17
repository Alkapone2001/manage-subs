const clientForm = document.getElementById('client-form');
const settingsForm = document.getElementById('settings-form');
const formMessage = document.getElementById('form-message');
const settingsMessage = document.getElementById('settings-message');
const notificationsContainer = document.getElementById('notifications');
const clientList = document.getElementById('client-list');
const adminEmailInput = document.getElementById('adminEmail');
const notificationWindowInput = document.getElementById('notificationWindowDays');

let notificationWindowDays = 7;

const formatDate = (value) => new Date(value).toLocaleDateString();

const showMessage = (element, message, type = 'success') => {
  element.textContent = message;
  element.className = `message ${type}`;
};

const renderNotifications = (data) => {
  if (!data || !data.items || data.items.length === 0) {
    notificationsContainer.innerHTML = '<p>No subscriptions are ending within the notification window.</p>';
    return;
  }

  const rows = data.items.map((item) => {
    const daysLeft = Math.max(0, Math.ceil((new Date(item.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)));
    return `
      <tr>
        <td>${item.firstName} ${item.lastName}</td>
        <td>${item.email}</td>
        <td>${item.discordTag}</td>
        <td>${formatDate(item.expiresAt)}</td>
        <td class="status-soon">${daysLeft} day(s)</td>
      </tr>
    `;
  }).join('');

  notificationsContainer.innerHTML = `
    <p class="notification-summary">Showing subscriptions expiring within the next ${data.windowDays} days.</p>
    <table>
      <thead>
        <tr>
          <th>Client</th>
          <th>Email</th>
          <th>Discord</th>
          <th>Expires</th>
          <th>Time left</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const renderClientList = (items) => {
  if (!items || items.length === 0) {
    clientList.innerHTML = '<p>No clients registered yet.</p>';
    return;
  }

  const rows = items.map((item) => {
    const daysLeft = Math.max(0, Math.ceil((new Date(item.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)));
    const statusClass = daysLeft <= notificationWindowDays ? 'status-soon' : '';
    return `
      <tr>
        <td>${item.firstName} ${item.lastName}</td>
        <td>${item.email}</td>
        <td>${item.phoneNumber || '-'}</td>
        <td>${item.discordTag}</td>
        <td>${formatDate(item.registeredAt)}</td>
        <td>${item.planMonths} month(s)</td>
        <td>${formatDate(item.expiresAt)}</td>
        <td class="${statusClass}">${daysLeft}</td>
        <td class="action-cell">
          <input type="number" min="1" value="1" class="input-small extend-input" data-id="${item.id}" aria-label="Extend months" />
          <button type="button" class="small-button extend-button" data-id="${item.id}">Extend</button>
          <button type="button" class="small-button danger delete-button" data-id="${item.id}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  clientList.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Client</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Discord</th>
          <th>Registered</th>
          <th>Plan</th>
          <th>Expires</th>
          <th>Days left</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  attachClientActions();
};

const attachClientActions = () => {
  document.querySelectorAll('.delete-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id;
      await deleteClient(id);
    });
  });

  document.querySelectorAll('.extend-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id;
      const input = document.querySelector(`.extend-input[data-id="${id}"]`);
      const months = Number(input.value);
      await extendClient(id, months);
    });
  });
};

const loadClients = async () => {
  const response = await fetch('/api/clients');
  const data = await response.json();
  renderClientList(data);
};

const loadSettings = async () => {
  try {
    const response = await fetch('/api/settings');
    const settings = await response.json();
    adminEmailInput.value = settings.adminEmail || '';
    notificationWindowInput.value = settings.notificationWindowDays || 7;
    notificationWindowDays = settings.notificationWindowDays || 7;
  } catch (error) {
    showMessage(settingsMessage, 'Unable to load settings.', 'error');
  }
};

const loadNotifications = async () => {
  try {
    const response = await fetch('/api/notifications');
    const data = await response.json();
    renderNotifications(data);
  } catch (error) {
    notificationsContainer.innerHTML = '<p>Unable to load notifications.</p>';
  }
};

const deleteClient = async (id) => {
  try {
    const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Could not delete client');
    }
    showMessage(formMessage, 'Client deleted successfully.', 'success');
    formMessage.scrollIntoView({ behavior: 'smooth' });
    loadClients();
    loadNotifications();
  } catch (error) {
    showMessage(formMessage, error.message, 'error');
  }
};

const extendClient = async (id, months) => {
  if (!Number.isInteger(months) || months <= 0) {
    showMessage(formMessage, 'Enter a valid month count to extend.', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/clients/${id}/extend`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ months }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to extend subscription');
    }

    showMessage(formMessage, `Subscription extended by ${months} month(s).`, 'success');
    loadClients();
    loadNotifications();
  } catch (error) {
    showMessage(formMessage, error.message, 'error');
  }
};

clientForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(formMessage, '', '');

  const formData = new FormData(clientForm);
  const payload = {
    firstName: formData.get('firstName').trim(),
    lastName: formData.get('lastName').trim(),
    birthday: formData.get('birthday'),
    discordTag: formData.get('discordTag').trim(),

  try {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create client');
    }

    showMessage(formMessage, 'Client registered successfully!', 'success');
    clientForm.reset();
    clientForm.querySelector('[name="planMonths"]').value = '1';
    loadClients();
    loadNotifications();
  } catch (error) {
    showMessage(formMessage, error.message, 'error');
  }
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(settingsMessage, '', '');

  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: adminEmailInput.value.trim(),
        notificationWindowDays: Number(notificationWindowInput.value),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save settings');
    }

    showMessage(settingsMessage, 'Notification settings saved.', 'success');
    notificationWindowDays = result.notificationWindowDays;
    loadNotifications();
  } catch (error) {
    showMessage(settingsMessage, error.message, 'error');
  }
});

loadSettings();
loadClients();
loadNotifications();
