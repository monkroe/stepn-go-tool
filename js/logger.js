// Failas: js/logger.js (Versija V1.0.10 - su mėnesio suvestinėmis)

(function() {
    'use strict';
    
    const CATEGORIES = {
        go: {
            income: { "GGT Earnings": "GGT uždarbis", "Sneaker Rental": "Sportbačių nuoma", "Sneaker Sale": "Sportbačių pardavimas", "Shoe Box Sale": "Batų dėžės (Shoe Box) pardavimas", "Gem Sale": "Brangakmenių pardavimas", "Raw Stone Sale": "Neapdirbtų brangakmenių (Raw Stone) pardavimas", "Other": "Kita" },
            expense: { "Level-up": "Lygio kėlimas", "Minting": "Mintinimas", "Mystery Box Speed-up": "Dėžutės atidarymo pagreitinimas", "Raw Stone Upgrade": "Neapdirbtų brangakmenių (Raw Stone) lygio kėlimas", "Sneaker Purchase": "Sportbačių pirkimas", "Shoe Box Purchase": "Batų dėžės (Shoe Box) pirkimas", "Gem Purchase": "Brangakmenių pirkimas", "Mystery Box Slot Purchase": "Papildomų 'Mystery Box' vietų pirkimas", "Other": "Kita" }
        },
        og: {
            income: { "GST Earnings": "GST uždarbis", "Sneaker Sale": "Sportbačio pardavimas", "Shoe Box Sale": "Batų dėžės (Shoe Box) pardavimas", "Gem Sale": "Brangakmenių pardavimas", "Scroll Sale": "'Minting Scroll' pardavimas", "Other": "Kita" },
            expense: { "Repair": "Taisymas (HP)", "Level-up": "Lygio kėlimas", "Mystery Box opening": "Dėžutės atidarymas", "Restore": "Atributų atkūrimas", "Minting": "Mintinimas", "Sneaker Purchase": "Sportbačių pirkimas", "Shoe Box Purchase": "Batų dėžės (Shoe Box) pirkimas", "Scroll Purchase": "'Minting Scroll' pirkimas", "Other": "Kita" }
        }
    };

    const loggerElements = {};
    let currentLogData = []; 

    window.appActions = window.appActions || {};
    window.appActions.initLogger = initLogger;
    window.appActions.loadAndRenderLogTable = loadAndRenderLogTable;
    window.appActions.renderLogTable = renderLogTable;

    function initLogger() {
        cacheLoggerElements();
        populateCategoryFilter();
        resetLogForm();
        bindLoggerEventListeners();
        loadAndRenderLogTable();
    }

    function cacheLoggerElements() {
        const ids = [ 
            'logForm', 'platform', 'logDate', 'logType', 'logCategory', 'logDescription', 'logSubmitBtn', 
            'standardFields', 'goLevelUpFields', 'ogLevelUpFields', 'ogMintFields', 'ogRestoreFields', 'editFields', 
            'logTokenRadioGroup', 'logTokenAmount', 
            'goLevelUpGgt', 'goLevelUpGmt', 
            'ogLevelUpGst', 'ogLevelUpGmt', 
            'ogMintGst', 'ogMintGmt', 'ogMintScrollsCost',
            'ogRestoreGst', 'ogRestoreGmt', 'ogRestoreGemsGmt',
            'editRateUsd', 'editAmountUsd', 
            'logTableBody', 'summaryContainer', 
            'filterStartDate', 'filterEndDate', 'filterToken', 'filterSort', 'filterOrder', 'filterBtn', 'exportCsvBtn',
            'filterCategory'
        ];
        ids.forEach(id => { 
            const element = document.getElementById(id);
            if (element) {
                loggerElements[id] = element;
            }
        });
    }

    function bindLoggerEventListeners() {
        if (loggerElements.logForm) loggerElements.logForm.addEventListener('submit', handleLogSubmit);
        if (loggerElements.logTableBody) loggerElements.logTableBody.addEventListener('click', handleLogTableClick);
        if (loggerElements.filterBtn) loggerElements.filterBtn.addEventListener('click', loadAndRenderLogTable);
        if (loggerElements.exportCsvBtn) loggerElements.exportCsvBtn.addEventListener('click', handleExportToCsv);
        if (loggerElements.platform) {
            loggerElements.platform.addEventListener('change', () => {
                updateDynamicForm();
                updateCategoryFilter();
            });
        }
        if (loggerElements.logType) loggerElements.logType.addEventListener('change', updateDynamicForm);
        if (loggerElements.logCategory) loggerElements.logCategory.addEventListener('change', updateDynamicForm);
        if (loggerElements.editRateUsd) loggerElements.editRateUsd.addEventListener('input', () => syncEditInputs('rate'));
        if (loggerElements.editAmountUsd) loggerElements.editAmountUsd.addEventListener('input', () => syncEditInputs('amount'));
    }

    function populateCategoryFilter() {
        if (!loggerElements.filterCategory) return;
        
        const reverseCategoryMap = {};
        const allCategories = new Set();
        
        let categoryOrder = [];

        const processPlatform = (plat) => {
            const incomeKeys = Object.keys(CATEGORIES[plat].income);
            const expenseKeys = Object.keys(CATEGORIES[plat].expense);
            
            incomeKeys.forEach(key => {
                const value = CATEGORIES[plat].income[key];
                allCategories.add(value);
                if (!reverseCategoryMap[value]) reverseCategoryMap[value] = key;
            });
            expenseKeys.forEach(key => {
                const value = CATEGORIES[plat].expense[key];
                allCategories.add(value);
                if (!reverseCategoryMap[value]) reverseCategoryMap[value] = key;
            });
            
            categoryOrder.push(...incomeKeys.map(k => CATEGORIES[plat].income[k]));
            categoryOrder.push(...expenseKeys.map(k => CATEGORIES[plat].expense[k]));
        };

        if (loggerElements.platform.value) {
            processPlatform(loggerElements.platform.value);
            loggerElements.filterCategory.disabled = false;
        } else {
            processPlatform('go');
            processPlatform('og');
            loggerElements.filterCategory.disabled = true;
        }
        
        const sortedCategories = [...allCategories].sort((a, b) => {
            const indexA = categoryOrder.indexOf(a);
            const indexB = categoryOrder.indexOf(b);
            if(indexA === -1) return 1;
            if(indexB === -1) return -1;
            return indexA - indexB;
        });

        let optionsHTML = `<option value="">Visos</option>`;
        
        sortedCategories.forEach(cat => {
            const key = reverseCategoryMap[cat] || cat;
            optionsHTML += `<option value="${key}">${cat}</option>`;
        });

        loggerElements.filterCategory.innerHTML = optionsHTML;
    }

    async function handleLogSubmit(event) {
        event.preventDefault();
        const editingId = loggerElements.logForm.dataset.editingId;
        loggerElements.logSubmitBtn.disabled = true;
        loggerElements.logSubmitBtn.textContent = 'Apdorojama...';
        try {
            if (editingId) await handleUpdate(editingId);
            else await handleCreate();
            await loadAndRenderLogTable();
        } catch (error) {
            console.error("Submit error:", error);
            alert(`Įvyko klaida: ${error.message}`);
        } finally {
            resetLogForm();
        }
    }

    async function handleCreate() {
        const platform = loggerElements.platform.value;
        const category = loggerElements.logCategory.value;
        const date = loggerElements.logDate.value;
        const type = loggerElements.logType.value;
        let description = loggerElements.logDescription.value.trim();
        if (!platform || !type || !category) throw new Error("Prašome pasirinkti platformą, tipą ir kategoriją.");
        const commonData = { date, type, category, description, platform };
        let operations = [];

        if (platform === 'go' && category === 'Level-up') {
            const ggt = parseFloat(loggerElements.goLevelUpGgt.value) || 0;
            const gmt = parseFloat(loggerElements.goLevelUpGmt.value) || 0;
            if (ggt > 0) operations.push({ ...commonData, tokenKey: 'ggt', tokenAmount: ggt });
            if (gmt > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: gmt });
        } else if (platform === 'og' && category === 'Level-up') {
            const gst = parseFloat(loggerElements.ogLevelUpGst.value) || 0;
            const gmt = parseFloat(loggerElements.ogLevelUpGmt.value) || 0;
            if (gst > 0) operations.push({ ...commonData, tokenKey: 'gst', tokenAmount: gst });
            if (gmt > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: gmt });
        } else if (platform === 'og' && category === 'Minting') {
            const gst = parseFloat(loggerElements.ogMintGst.value) || 0;
            const gmtDirect = parseFloat(loggerElements.ogMintGmt.value) || 0;
            const scrollsCost = parseFloat(loggerElements.ogMintScrollsCost.value) || 0;
            const totalGmt = gmtDirect + scrollsCost;
            
            if (gst > 0) operations.push({ ...commonData, tokenKey: 'gst', tokenAmount: gst });
            if (totalGmt > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: totalGmt });
        } else if (platform === 'og' && category === 'Restore') {
            const gst = parseFloat(loggerElements.ogRestoreGst.value) || 0;
            const gmtDirect = parseFloat(loggerElements.ogRestoreGmt.value) || 0;
            const gmtGems = parseFloat(loggerElements.ogRestoreGemsGmt.value) || 0;
            const totalGmt = gmtDirect + gmtGems;
            if (gst > 0) operations.push({ ...commonData, tokenKey: 'gst', tokenAmount: gst });
            if (totalGmt > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: totalGmt });
        }
        else {
            const selectedTokenRadio = document.querySelector('input[name="logToken"]:checked');
            if (selectedTokenRadio) {
                const tokenAmount = parseFloat(loggerElements.logTokenAmount.value);
                if (!isNaN(tokenAmount) && tokenAmount > 0) {
                    operations.push({ ...commonData, tokenKey: selectedTokenRadio.value, tokenAmount });
                }
            }
        }

        if (operations.length === 0) {
            throw new Error("Neįvesta jokia suma arba suma yra nulinė.");
        }
        
        for (const op of operations) {
            await createSingleLogEntry(op);
        }
    }

    async function createSingleLogEntry(entryData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Vartotojas neprisijungęs.");
        loggerElements.logSubmitBtn.textContent = `Išsaugoma ${entryData.tokenKey.toUpperCase()}...`;
        const rate_usd = await window.appActions.getPriceForDate(entryData.tokenKey, entryData.date);
        const record = { ...entryData, token: entryData.tokenKey, token_amount: entryData.tokenAmount, rate_usd, user_id: user.id };
        delete record.tokenKey;
        delete record.tokenAmount;
        const { error } = await supabase.from('transactions').insert(record);
        if (error) throw error;
    }

    async function handleUpdate(id) {
        const record = {
            date: loggerElements.logDate.value,
            type: loggerElements.logType.value,
            token: document.querySelector('input[name="logToken"]:checked').value,
            token_amount: parseFloat(loggerElements.logTokenAmount.value),
            category: loggerElements.logCategory.value,
            description: loggerElements.logDescription.value.trim(),
            platform: loggerElements.platform.value,
            rate_usd: parseFloat(loggerElements.editRateUsd.value)
        };
        const oldEntry = JSON.parse(loggerElements.logForm.dataset.oldEntry);
        if (record.date !== oldEntry.date || record.token !== oldEntry.token) {
            loggerElements.logSubmitBtn.textContent = 'Gaunamas kursas...';
            record.rate_usd = await window.appActions.getPriceForDate(record.token, record.date);
        }
        const { error } = await supabase.from('transactions').update(record).eq('id', id);
        if (error) throw error;
    }

    async function handleLogTableClick(event) {
        const target = event.target;
        const separatorRow = target.closest('.date-separator-row');
        const actionButton = target.closest('button');

        if (separatorRow) {
            handleAccordionToggle(separatorRow);
            return;
        }

        if (actionButton) {
            const row = actionButton.closest('tr');
            if (!row || !row.dataset.id) return;
            const entryId = parseInt(row.dataset.id);

            if (actionButton.matches('.btn-delete')) {
                if (confirm('Ar tikrai norite ištrinti šį įrašą?')) {
                    const { error } = await supabase.from('transactions').delete().eq('id', entryId);
                    if (error) alert(`Klaida trinant: ${error.message}`);
                    else await loadAndRenderLogTable();
                }
            } else if (actionButton.matches('.btn-edit')) {
                const { data, error } = await supabase.from('transactions').select().eq('id', entryId).single();
                if (error) { alert(`Klaida gaunant įrašą: ${error.message}`); return; }
                startEditEntry(data);
            }
        }
    }
    
    function handleAccordionToggle(separatorRow) {
        const date = separatorRow.dataset.dateGroup;
        if (!date) return;
        
        const isExpanded = separatorRow.classList.toggle('expanded');
        
        const arrowIcon = separatorRow.querySelector('.toggle-arrow');
        if (arrowIcon) {
            arrowIcon.textContent = isExpanded ? '▾' : '▸';
        }

        const transactionRows = document.querySelectorAll(`.transaction-row[data-date-group="${date}"]`);
        transactionRows.forEach(row => {
            row.classList.toggle('hidden');
        });
    }

    function startEditEntry(entry) {
        resetLogForm();
        loggerElements.logForm.dataset.editingId = entry.id;
        loggerElements.logForm.dataset.oldEntry = JSON.stringify(entry);
        loggerElements.platform.value = entry.platform || 'go';
        loggerElements.logDate.value = entry.date;
        loggerElements.logType.value = entry.type;
        updateDynamicForm();
        loggerElements.logCategory.value = entry.category;
        updateVisibleFields();
        const tokensForPlatform = entry.platform === 'go' ? ['ggt', 'gmt', 'usdc'] : ['gst', 'gmt', 'sol', 'usdc'];
        updateTokenRadioButtons(tokensForPlatform);
        const radioToSelect = document.querySelector(`input[name="logToken"][value="${entry.token}"]`);
        if (radioToSelect) radioToSelect.checked = true;
        loggerElements.logTokenAmount.value = entry.token_amount;
        loggerElements.logDescription.value = entry.description;
        loggerElements.editRateUsd.value = (entry.rate_usd || 0).toFixed(8);
        loggerElements.editAmountUsd.value = ((entry.rate_usd || 0) * (entry.token_amount || 0)).toFixed(2);
        loggerElements.logSubmitBtn.textContent = 'Atnaujinti įrašą';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetLogForm() {
        if (loggerElements.logForm) {
            loggerElements.logForm.reset();
            delete loggerElements.logForm.dataset.editingId;
            delete loggerElements.logForm.dataset.oldEntry;
            loggerElements.platform.value = "";
            loggerElements.logType.value = "";
            updateDynamicForm();
            const today = new Date();
            today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
            loggerElements.logDate.value = today.toISOString().split('T')[0];
            loggerElements.logSubmitBtn.textContent = 'Pridėti įrašą';
            loggerElements.logSubmitBtn.disabled = false;
        }
    }

    function updateDynamicForm() {
        updateCategoryDropdown();
        updateVisibleFields();
    }

    function updateCategoryDropdown() {
        if (!loggerElements.platform || !loggerElements.logType || !loggerElements.logCategory) return;
        const platform = loggerElements.platform.value;
        const type = loggerElements.logType.value;
        const platformCategories = CATEGORIES[platform]?.[type] || {};
        const options = Object.entries(platformCategories);
        let optionsHTML = `<option value="" disabled selected>Pasirinkite kategoriją...</option>`;
        optionsHTML += options.map(([key, value]) => `<option value="${key}">${value}</option>`).join('');
        const currentCategory = loggerElements.logCategory.value;
        loggerElements.logCategory.innerHTML = optionsHTML;
        if (platformCategories[currentCategory]) {
            loggerElements.logCategory.value = currentCategory;
        } else {
            loggerElements.logCategory.value = "";
        }
        loggerElements.logCategory.disabled = Object.keys(platformCategories).length === 0;
    }

    function updateVisibleFields() {
        if (!loggerElements.platform || !loggerElements.logCategory) return;
        const platform = loggerElements.platform.value;
        const category = loggerElements.logCategory.value;
        ['standardFields', 'goLevelUpFields', 'ogLevelUpFields', 'ogMintFields', 'ogRestoreFields', 'editFields'].forEach(id => { 
            const element = loggerElements[id];
            if (element) {
                element.classList.add('hidden'); 
            }
        });

        const isEditing = !!loggerElements.logForm.dataset.editingId;
        if (isEditing) {
            loggerElements.standardFields.classList.remove('hidden');
            loggerElements.editFields.classList.remove('hidden');
            return;
        }

        if (platform === 'go' && category === 'Level-up') {
            loggerElements.goLevelUpFields.classList.remove('hidden');
        } else if (platform === 'og' && category === 'Level-up') {
            loggerElements.ogLevelUpFields.classList.remove('hidden');
        } else if (platform === 'og' && category === 'Minting') {
            loggerElements.ogMintFields.classList.remove('hidden');
        } else if (platform === 'og' && category === 'Repair') {
            loggerElements.standardFields.classList.remove('hidden');
            updateTokenRadioButtons(['gst']);
        } else if (platform === 'og' && category === 'Restore') {
            loggerElements.ogRestoreFields.classList.remove('hidden');
        } else if (category) {
            loggerElements.standardFields.classList.remove('hidden');
            let tokensForPlatform = ['gmt', 'sol', 'usdc'];
            if (platform === 'go') {
                tokensForPlatform = ['ggt', 'gmt', 'usdc'];
            } else if (platform === 'og') {
                tokensForPlatform = ['gst', 'gmt', 'sol', 'usdc'];
            }
            updateTokenRadioButtons(tokensForPlatform);
        }
    }

    function updateTokenRadioButtons(tokensToShow) {
        if (!loggerElements.logTokenRadioGroup) return;
        const tokens = window.appData.tokens;
        loggerElements.logTokenRadioGroup.innerHTML = tokensToShow.map((key, index) => {
            const token = tokens[key];
            return `<label class="radio-label"><span><img src="${token.logo}" alt="${token.symbol}" class="token-logo">${token.symbol}</span><input type="radio" name="logToken" value="${key}" ${index === 0 ? 'checked' : ''}><span class="radio-custom-dot"></span></label>`;
        }).join('');
    }

    function syncEditInputs(source) {
        const rate = parseFloat(loggerElements.editRateUsd.value);
        const total = parseFloat(loggerElements.editAmountUsd.value);
        const amount = parseFloat(loggerElements.logTokenAmount.value);
        if (source === 'rate' && !isNaN(rate) && !isNaN(amount)) {
            loggerElements.editAmountUsd.value = (amount * rate).toFixed(2);
        } else if (source === 'amount' && !isNaN(total) && !isNaN(amount) && amount > 0) {
            loggerElements.editRateUsd.value = (total / amount).toFixed(8);
        }
    }
    
    async function loadAndRenderLogTable() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            currentLogData = [];
            renderLogTable(currentLogData);
            populateFilterDropdowns(currentLogData);
            return;
        }
        let query = supabase.from('transactions').select('*').eq('user_id', user.id);
        
        if (loggerElements.filterStartDate.value) query = query.gte('date', loggerElements.filterStartDate.value);
        if (loggerElements.filterEndDate.value) query = query.lte('date', loggerElements.filterEndDate.value);
        if (loggerElements.filterToken.value) query = query.eq('token', loggerElements.filterToken.value);
        if (loggerElements.filterCategory.value) query = query.eq('category', loggerElements.filterCategory.value);
        
        query = query.order(loggerElements.filterSort.value, { ascending: loggerElements.filterOrder.value === 'asc' }).order('id', { ascending: false });
        
        const { data, error } = await query;
        if (error) { 
            console.error('Klaida gaunant duomenis:', error); 
            return; 
        }
        
        currentLogData = data || [];
        renderLogTable(currentLogData);
        populateFilterDropdowns(currentLogData);
    }
    
    function populateFilterDropdowns(data) {
        if (!loggerElements.filterToken) return;
        const uniqueTokens = [...new Set(data.map(item => item.token))];
        let optionsHTML = '<option value="">Visi</option>';
        uniqueTokens.sort().forEach(token => { 
            let displayToken = window.appData.tokens[token]?.symbol || token.toUpperCase();
            if (displayToken === 'GST (SOL)') {
                displayToken = 'GST';
            }
            optionsHTML += `<option value="${token}">${displayToken}</option>`; 
        });
        const currentValue = loggerElements.filterToken.value;
        loggerElements.filterToken.innerHTML = optionsHTML;
        if (uniqueTokens.includes(currentValue)) {
            loggerElements.filterToken.value = currentValue;
        }
    }

    function groupDataByMonthAndDay(transactions) {
        const monthlyData = {};
        transactions.forEach(entry => {
            const date = new Date(entry.date + 'T00:00:00');
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const dayKey = entry.date;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { days: {}, monthlyIncome: 0, monthlyExpense: 0 };
            }
            if (!monthlyData[monthKey].days[dayKey]) {
                monthlyData[monthKey].days[dayKey] = { transactions: [], dailyIncome: 0, dailyExpense: 0 };
            }
            const amount_usd = (entry.token_amount || 0) * (entry.rate_usd || 0);
            if (entry.type === 'income') {
                monthlyData[monthKey].monthlyIncome += amount_usd;
                monthlyData[monthKey].days[dayKey].dailyIncome += amount_usd;
            } else {
                monthlyData[monthKey].monthlyExpense += amount_usd;
                monthlyData[monthKey].days[dayKey].dailyExpense += amount_usd;
            }
            monthlyData[monthKey].days[dayKey].transactions.push(entry);
        });
        return monthlyData;
    }

    function renderLogTable(data) {
        if (!loggerElements.logTableBody) return;
        loggerElements.logTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Kraunama...</td></tr>';
        
        if (!data || data.length === 0) {
            loggerElements.logTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Įrašų nerasta.</td></tr>`;
            renderSummary(0, 0, {});
            return;
        }

        const groupedData = groupDataByMonthAndDay(data);
        const months = Object.keys(groupedData).sort().reverse();
        let totalIncomeUSD = 0, totalExpenseUSD = 0;
        const tokenBalances = {};
        let finalHTML = '';

        months.forEach(monthKey => {
            const monthData = groupedData[monthKey];
            const monthDate = new Date(monthKey + '-01T00:00:00');
            const monthName = monthDate.toLocaleDateString('lt-LT', { month: 'long', year: 'numeric' });
            const monthlyNet = monthData.monthlyIncome - monthData.monthlyExpense;
            const monthlyNetColor = monthlyNet >= 0 ? 'income-color' : 'expense-color';
            const monthlyNetSign = monthlyNet >= 0 ? '+' : '';

            finalHTML += `
                <tr class="month-separator-row">
                    <td colspan="8">
                        <div class="date-separator-content">
                            <span>${monthName.toUpperCase()}</span>
                            <span class="monthly-summary">
                                <span class="daily-income">+${monthData.monthlyIncome.toFixed(2)}</span>
                                <span class="daily-expense">-${monthData.monthlyExpense.toFixed(2)}</span>
                                <span class="daily-net ${monthlyNetColor}">${monthlyNetSign}${monthlyNet.toFixed(2)}</span>
                            </span>
                        </div>
                    </td>
                </tr>
            `;
            
            const days = Object.keys(monthData.days).sort().reverse();

            days.forEach(dayKey => {
                const dayData = monthData.days[dayKey];
                const displayDate = new Date(dayKey + 'T00:00:00');
                const dailyNet = dayData.dailyIncome - dayData.dailyExpense;
                const netColorClass = dailyNet >= 0 ? 'income-color' : 'expense-color';
                const netSign = dailyNet >= 0 ? '+' : '';

                finalHTML += `
                    <tr class="date-separator-row" data-date-group="${dayKey}">
                        <td colspan="8">
                            <div class="date-separator-content">
                                <span class="date-display">
                                    <span class="toggle-arrow">▸</span>
                                    ${displayDate.toLocaleDateString('lt-LT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                                <span class="daily-summary">
                                    <span class="daily-income">+${dayData.dailyIncome.toFixed(2)}</span>
                                    <span class="daily-expense">-${dayData.dailyExpense.toFixed(2)}</span>
                                    <span class="daily-net ${netColorClass}">${netSign}${dailyNet.toFixed(2)}</span>
                                </span>
                            </div>
                        </td>
                    </tr>
                `;

                dayData.transactions.forEach(entry => {
                    const amount_usd = (entry.token_amount || 0) * (entry.rate_usd || 0);
                    const isIncome = entry.type === 'income';
                    totalIncomeUSD += isIncome ? amount_usd : 0;
                    totalExpenseUSD += !isIncome ? amount_usd : 0;
                    if (!tokenBalances[entry.token]) tokenBalances[entry.token] = 0;
                    tokenBalances[entry.token] += isIncome ? entry.token_amount : -entry.token_amount;
                    const tokenSymbol = (window.appData.tokens[entry.token]?.symbol || entry.token.toUpperCase()).replace(' (SOL)', '');
                    const iconPath = `img/${entry.token.toLowerCase()}.svg`;
                    const tokenCellHTML = `<img src="${iconPath}" alt="${tokenSymbol}" class="token-icon-table" onerror="this.outerHTML = '<span>${tokenSymbol}</span>'">`;
                    const arrow = isIncome ? '▲' : '▼';

                    finalHTML += `
                        <tr class="transaction-row hidden" data-id="${entry.id}" data-date-group="${dayKey}">
                            <td class="align-middle">${entry.date}</td>
                            <td class="arrow-cell align-middle ${isIncome ? 'income-color' : 'expense-color'}">${arrow}</td>
                            <td class="token-cell align-middle">${tokenCellHTML}</td>
                            <td class="align-middle">${(entry.token_amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                            <td class="align-middle">$${(entry.rate_usd || 0).toFixed(5)}</td>
                            <td class="align-middle">$${amount_usd.toFixed(2)}</td>
                            <td class="align-middle">${entry.description || ''}</td>
                            <td class="log-table-actions align-middle">
                                <button class="btn-edit">Taisyti</button>
                                <button class="btn-delete">Trinti</button>
                            </td>
                        </tr>
                    `;
                });
            });
        });
        
        loggerElements.logTableBody.innerHTML = finalHTML;
        renderSummary(totalIncomeUSD, totalExpenseUSD, tokenBalances);
    }
    
    function renderSummary(income, expense, tokenBalances) {
        if (!loggerElements.summaryContainer) return;
        const balance = income - expense;
        const btcPrice = window.appData.prices['bitcoin']?.price;
        let btcValueHTML = '';
        if (btcPrice > 0) { btcValueHTML = `<div class="summary-row"><span class="summary-label btc-value"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-right" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/></svg> BTC Atitikmuo:</span><span class="summary-value btc-value">${(balance / btcPrice).toFixed(8)} BTC</span></div>`; }
        let tokenBalancesHTML = '<hr class="my-4 border-gray-700"><h3 class="text-lg font-semibold mb-2">Žetonų Balansai</h3>';
        Object.keys(tokenBalances).sort().forEach(token => { 
            const amount = tokenBalances[token];
            let displayToken = window.appData.tokens[token]?.symbol || token.toUpperCase();
            if (displayToken === 'GST (SOL)') {
                displayToken = 'GST';
            }
            tokenBalancesHTML += `<div class="summary-row"><span class="summary-label">${displayToken} Balansas:</span><span class="summary-value ${amount >= 0 ? 'income-color' : 'expense-color'}">${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span></div>`; 
        });
        loggerElements.summaryContainer.innerHTML = `<h3 class="text-lg font-semibold mb-2">Bendra suvestinė (pagal filtrus)</h3><div class="summary-row"><span class="summary-label">Viso Pajamų (USD):</span><span class="summary-value income-color">$${income.toFixed(2)}</span></div><div class="summary-row"><span class="summary-label">Viso Išlaidų (USD):</span><span class="summary-value expense-color">$${expense.toFixed(2)}</span></div><div class="summary-row text-lg border-t border-gray-700 mt-2 pt-2"><strong class="summary-label">Grynasis Balansas (USD):</strong><strong class="summary-value ${balance >= 0 ? 'income-color' : 'expense-color'}">$${balance.toFixed(2)}</strong></div>${btcValueHTML}${tokenBalancesHTML}`;
    }

    function handleExportToCsv() {
        try {
            if (!currentLogData || currentLogData.length === 0) {
                alert('Nėra duomenų, kuriuos būtų galima eksportuoti.');
                return;
            }
            const headers = [ "Data", "Platforma", "Tipas", "Kategorija", "Žetonas", "Kiekis", "Kursas (USD)", "Suma (USD)", "Aprašymas" ];
            const rows = currentLogData.map(entry => {
                const amount_usd = (entry.token_amount || 0) * (entry.rate_usd || 0);
                return [
                    entry.date,
                    entry.platform,
                    entry.type,
                    entry.category,
                    entry.token,
                    entry.token_amount || 0,
                    entry.rate_usd || 0,
                    amount_usd,
                    entry.description || ''
                ].map(field => String(field)); 
            });
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(escapeCsvField).join(','))
            ].join('\n');
            downloadCsv(csvContent);
        } catch (error) {
            console.error("Įvyko klaida eksportuojant CSV:", error);
            alert(`Eksportavimo klaida: ${error.message}`);
        }
    }

    function escapeCsvField(field) {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }

    function downloadCsv(csvContent) {
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        const today = new Date().toISOString().slice(0, 10);
        link.setAttribute("href", url);
        link.setAttribute("download", `stepn-go-transakcijos-${today}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
})();
