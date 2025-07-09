// Failas: js/logger.js (Versija su mėnesių grupavimu)

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
    
    // ... (visos funkcijos iki renderLogTable lieka nepakitusios)

    function renderLogTable(data) {
        if (!loggerElements.logTableBody) return;
        loggerElements.logTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Kraunama...</td></tr>';
        
        if (!data || data.length === 0) {
            loggerElements.logTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Įrašų nerasta.</td></tr>`;
            renderSummary(0, 0, {});
            return;
        }

        const groupedData = groupTransactionsByDate(data);
        const dates = Object.keys(groupedData);
        let totalIncomeUSD = 0, totalExpenseUSD = 0;
        const tokenBalances = {};
        let finalHTML = '';
        let lastMonth = null; // Kintamasis paskutiniam mėnesiui sekti

        dates.forEach(date => {
            const group = groupedData[date];
            const currentDate = new Date(date + 'T00:00:00');
            const currentMonth = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

            // === PAKEITIMAS ČIA: Tikriname, ar pasikeitė mėnuo ===
            if (currentMonth !== lastMonth) {
                lastMonth = currentMonth;
                const monthName = currentDate.toLocaleDateString('lt-LT', { month: 'long', year: 'numeric' });
                finalHTML += `
                    <tr class="month-separator-row">
                        <td colspan="8">${monthName.toUpperCase()}</td>
                    </tr>
                `;
            }
            // =======================================================

            const dailyNet = group.dailyIncome - group.dailyExpense;
            const netColorClass = dailyNet >= 0 ? 'income-color' : 'expense-color';
            const netSign = dailyNet >= 0 ? '+' : '';

            finalHTML += `
                <tr class="date-separator-row" data-date-group="${date}">
                    <td colspan="8">
                        <div class="date-separator-content">
                            <span class="date-display">
                                <span class="toggle-arrow">▸</span>
                                ${currentDate.toLocaleDateString('lt-LT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            <span class="daily-summary">
                                <span class="daily-income">+${group.dailyIncome.toFixed(2)}</span>
                                <span class="daily-expense">-${group.dailyExpense.toFixed(2)}</span>
                                <span class="daily-net ${netColorClass}">${netSign}${dailyNet.toFixed(2)}</span>
                            </span>
                        </div>
                    </td>
                </tr>
            `;

            group.transactions.forEach(entry => {
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
                    <tr class="transaction-row hidden" data-id="${entry.id}" data-date-group="${date}">
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
        
        loggerElements.logTableBody.innerHTML = finalHTML;
        renderSummary(totalIncomeUSD, totalExpenseUSD, tokenBalances);
    }
    
    // ... (visos likusios funkcijos lieka nepakitusios)

})();

