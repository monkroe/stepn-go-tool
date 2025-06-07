
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('tab-content-logger');
  const logForm = document.createElement('form');
  logForm.id = 'logForm';
  logForm.innerHTML = `
    <div class="input-group">
      <label for="logDate">Data</label>
      <input type="date" id="logDate" required>
    </div>
    <div class="input-group">
      <label for="logType">Tipas</label>
      <select id="logType" required>
        <option value="income">Pajamos</option>
        <option value="expense">Išlaidos</option>
      </select>
    </div>
    <div class="input-group">
      <label for="logToken">Žetonas</label>
      <select id="logToken" required>
        <option value="ggt">GGT</option>
        <option value="gst">GST</option>
        <option value="gmt">GMT</option>
      </select>
    </div>
    <div class="input-group">
      <label for="logAmount">Suma</label>
      <input type="number" id="logAmount" step="any" required>
    </div>
    <div class="input-group">
      <label for="logDescription">Aprašymas</label>
      <input type="text" id="logDescription">
    </div>
    <button type="submit" class="primary-btn mt-4">Pridėti įrašą</button>
  `;
  container.appendChild(logForm);

  const table = document.createElement('table');
  table.className = 'min-w-full mt-6';
  table.innerHTML = `
    <thead><tr>
      <th>Data</th><th>Tipas</th><th>Žetonas</th><th>Suma</th><th>Aprašymas</th>
    </tr></thead>
    <tbody id="logTableBody"></tbody>
  `;
  container.appendChild(table);

  logForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      alert("Prisijunkite norėdami įrašyti duomenis.");
      return;
    }
    const user_id = session.user.id;

    const record = {
      date: document.getElementById('logDate').value,
      type: document.getElementById('logType').value,
      token: document.getElementById('logToken').value,
      amount: parseFloat(document.getElementById('logAmount').value),
      description: document.getElementById('logDescription').value,
      user_id: user_id
    };

    const { error } = await supabase.from('transactions').insert([record]);
    if (error) alert('Klaida: ' + error.message);
    else {
      logForm.reset();
      loadLogs();
    }
  });

  async function loadLogs() {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      document.getElementById('logTableBody').innerHTML = '<tr><td colspan="5">Prisijunkite, kad matytumėte įrašus.</td></tr>';
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });

    const tbody = document.getElementById('logTableBody');
    tbody.innerHTML = '';
    if (error) return;

    data.forEach(entry => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${entry.date}</td><td>${entry.type}</td><td>${entry.token}</td><td>${entry.amount}</td><td>${entry.description || ''}</td>`;
      tbody.appendChild(tr);
    });
  }

  loadLogs();
});
