const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const logoutButton = document.getElementById('logoutButton');
const clientForm = document.getElementById('client-form');
const settingsForm = document.getElementById('settings-form');
const profileForm = document.getElementById('profile-form');
const profileEmailInput = document.getElementById('profileEmail');
const profileEmailLabel = document.getElementById('profileEmailLabel');
const formMessage = document.getElementById('form-message');
const settingsMessage = document.getElementById('settings-message');
const profileMessage = document.getElementById('profile-message');
const notificationsContainer = document.getElementById('notifications');
const clientList = document.getElementById('client-list');
const notificationWindowInput = document.getElementById('notificationWindowDays');
const testEmailButton = document.getElementById('testEmailButton');
const testEmailMessage = document.getElementById('testEmailMessage');

let notificationWindowDays = 7;

const formatDate = (value) => new Date(value).toLocaleDateString('sq-AL', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const showMessage = (element, message, type = 'success') => {
  element.textContent = message;
  element.className = `message ${type}`;
};

const showScreen = (authenticated) => {
  loginScreen.classList.toggle('hidden', authenticated);
  mainApp.classList.toggle('hidden', !authenticated);
  logoutButton.classList.toggle('hidden', !authenticated);
};

const renderNotifications = (data) => {
  if (!data || !data.items || data.items.length === 0) {
    notificationsContainer.innerHTML = '<p>Nuk ka abonime që skadojnë brenda dritares së njoftimeve.</p>';
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
        <td class="status-soon">${daysLeft} ditë</td>
      </tr>
    `;
  }).join('');

  notificationsContainer.innerHTML = `
    <p class="notification-summary">Shfaq abonimet që skadojnë brenda ${data.windowDays} ditësh.</p>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Klienti</th>
            <th>Email</th>
            <th>Discord</th>
            <th>Skadon</th>
            <th>Ditë</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

const renderClientList = (items) => {
  if (!items || items.length === 0) {
    clientList.innerHTML = '<p>Nuk ka klientë të regjistruar ende.</p>';
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
        <td>${item.planMonths} muaj</td>
        <td>${formatDate(item.expiresAt)}</td>
        <td class="${statusClass}">${daysLeft}</td>
        <td class="action-cell">
          <input type="number" min="1" value="1" class="input-small extend-input" data-id="${item.id}" aria-label="Zgjat muaj" />
          <button type="button" class="small-button extend-button" data-id="${item.id}">Zgjat</button>
          <button type="button" class="small-button danger delete-button" data-id="${item.id}">Fshij</button>
        </td>
      </tr>
    `;
  }).join('');

  clientList.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Klienti</th>
            <th>Email</th>
            <th>Telefon</th>
            <th>Discord</th>
            <th>Regjistruar</th>
            <th>Plan</th>
            <th>Skadon</th>
            <th>Ditë</th>
            <th>Veprime</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
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
  try {
    const response = await fetch('/api/clients');
    if (!response.ok) {
      throw new Error('Nuk u ngarkuan klientët');
    }
    const data = await response.json();
    renderClientList(data);
  } catch (error) {
    clientList.innerHTML = `<p>${error.message}</p>`;
  }
};

const fetchAuthStatus = async () => {
  try {
    const response = await fetch('/api/auth-status');
    const data = await response.json();
    showScreen(data.authenticated);
    if (data.authenticated) {
      await loadAppData();
    }
  } catch (error) {
    showMessage(loginMessage, 'Nuk u lidh shërbimi i autorizimit.', 'error');
  }
};

const loadAppData = async () => {
  await Promise.all([loadClients(), loadSettings(), loadNotifications()]);
};

const loadSettings = async () => {
  try {
    const response = await fetch('/api/settings');
    const settings = await response.json();
    profileEmailInput.value = settings.adminEmail || '';
    profileEmailLabel.textContent = settings.adminEmail || '-';
    notificationWindowInput.value = settings.notificationWindowDays || 7;
    notificationWindowDays = settings.notificationWindowDays || 7;
  } catch (error) {
    showMessage(settingsMessage, 'Nuk u ngarkuan vendosjet.', 'error');
  }
};

const loadNotifications = async () => {
  try {
    const response = await fetch('/api/notifications');
    const data = await response.json();
    renderNotifications(data);
  } catch (error) {
    notificationsContainer.innerHTML = '<p>Nuk u ngarkuan njoftimet.</p>';
  }
};

const deleteClient = async (id) => {
  try {
    const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Nuk u fshi klienti.');
    }
    showMessage(formMessage, 'Klienti u fshi me sukses.', 'success');
    await loadAppData();
  } catch (error) {
    showMessage(formMessage, error.message, 'error');
  }
};

const extendClient = async (id, months) => {
  if (!Number.isInteger(months) || months <= 0) {
    showMessage(formMessage, 'Vendosni një numër muazhesh të vlefshëm.', 'error');
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
      throw new Error(result.error || 'Nuk u zgjat abonimi');
    }

    showMessage(formMessage, 'Abonimi u zgjat me sukses.', 'success');
    await loadAppData();
  } catch (error) {
    showMessage(formMessage, error.message, 'error');
  }
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(loginMessage, '', '');

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Hyrja dështoi');
    }
    showScreen(true);
    await loadAppData();
  } catch (error) {
    showMessage(loginMessage, error.message, 'error');
  }
});

logoutButton.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  showScreen(false);
});

clientForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(formMessage, '', '');

  const formData = new FormData(clientForm);
  const payload = {
    firstName: formData.get('firstName').trim(),
    lastName: formData.get('lastName').trim(),
    birthday: formData.get('birthday'),
    discordTag: formData.get('discordTag').trim(),
    phoneNumber: formData.get('phoneNumber').trim(),
    email: formData.get('email').trim(),
    planMonths: Number(formData.get('planMonths')),
  };

  try {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Regjistrimi i klientit dështoi');
    }

    showMessage(formMessage, 'Klienti u regjistrua me sukses.', 'success');
    clientForm.reset();
    clientForm.querySelector('[name="planMonths"]').value = '1';
    await loadAppData();
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
      body: JSON.stringify({ notificationWindowDays: Number(notificationWindowInput.value) }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Nuk u ruajtën vendosjet');
    }

    showMessage(settingsMessage, 'Vendosjet u ruajtën.', 'success');
    notificationWindowDays = result.notificationWindowDays;
    await loadNotifications();
  } catch (error) {
    showMessage(settingsMessage, error.message, 'error');
  }
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(profileMessage, '', '');

  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail: profileEmailInput.value.trim() }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Nuk u ruajt emaili');
    }

    showMessage(profileMessage, 'Email u ruajt.', 'success');
    profileEmailLabel.textContent = result.adminEmail || '-';
  } catch (error) {
    showMessage(profileMessage, error.message, 'error');
  }
});

if (testEmailButton) {
  testEmailButton.addEventListener('click', async () => {
    showMessage(testEmailMessage, 'Duke dërguar...', '');
    try {
      const response = await fetch('/api/test-email', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Dërgimi dështoi');
      showMessage(testEmailMessage, `Email i testit u dërgua te ${result.to}`, 'success');
    } catch (err) {
      showMessage(testEmailMessage, err.message || 'Gabim gjatë dërgimit', 'error');
    }
  });
}

fetchAuthStatus();
