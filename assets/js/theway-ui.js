(function (window, document) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const core = app.core;
    if (!core) return;

    let cachedSearchTargets = null;

    function visibleText(element) {
        return core.normalize(element.textContent || element.value || "");
    }

    function setVisible(element, visible) {
        if (!element.dataset.twDisplay) {
            element.dataset.twDisplay = element.style.display || "";
        }
        element.style.display = visible ? element.dataset.twDisplay : "none";
    }

    function getSearchTargets() {
        const selectors = [
            "tbody tr",
            ".opportunity-card",
            ".job-card",
            ".settings-card",
            ".content-card",
            ".card",
            ".stat-card",
            ".kpi-card",
            ".ticket-row",
            ".company-row",
            ".role-item",
            ".activity-item",
            ".skill-item"
        ];

        if (!cachedSearchTargets) {
            cachedSearchTargets = Array.from(document.querySelectorAll(selectors.join(","))).filter(function (target) {
                return !target.closest(".sidebar, .top-header, nav");
            });
        }
        return cachedSearchTargets;
    }

    function applyTextFilter(query) {
        const normalizedQuery = core.normalize(query);
        const targets = getSearchTargets();
        if (!targets.length) return;
        targets.forEach(function (target) {
            setVisible(target, !normalizedQuery || visibleText(target).includes(normalizedQuery));
        });
    }

    function shouldWireSearchInput(input) {
        if (input.closest("form#loginForm, form#signupForm")) return false;
        return core.normalize(input.placeholder).includes("rechercher") ||
            input.id === "searchInput" ||
            input.classList.contains("search-input");
    }

    function initSearchAndFilters() {
        const searchInputs = Array.from(document.querySelectorAll(
            ".search-box input, .filter-search input, input.search-input, .search-form input, #searchInput"
        )).filter(shouldWireSearchInput);

        searchInputs.forEach(function (input) {
            input.addEventListener("focus", function () {
                cachedSearchTargets = null;
                getSearchTargets();
            });
            input.addEventListener("input", function () {
                applyTextFilter(input.value);
            });
        });

        document.querySelectorAll(".filter-select, select[id*='Filter']").forEach(function (select) {
            select.addEventListener("change", function () {
                const value = core.normalize(select.value);
                const label = core.normalize(select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : "");
                const query = ["all", "tous", "toutes", ""].includes(value) ? "" : (value || label);
                applyTextFilter(query);
            });
        });
    }

    function cellSortValue(row, index) {
        const cell = row.cells[index];
        const text = cell ? core.normalize(cell.textContent) : "";
        const numeric = parseFloat(text.replace(/[^0-9.-]/g, ""));
        return {
            row: row,
            text: text,
            numeric: Number.isFinite(numeric) ? numeric : null
        };
    }

    function initTableSorting() {
        document.querySelectorAll("table").forEach(function (table) {
            const headers = Array.from(table.querySelectorAll("th"));
            headers.forEach(function (header, index) {
                header.addEventListener("click", function () {
                    const tbody = table.tBodies[0];
                    if (!tbody) return;

                    const direction = header.dataset.sortDirection === "asc" ? "desc" : "asc";
                    header.dataset.sortDirection = direction;
                    const decoratedRows = Array.from(tbody.rows).map(function (row) {
                        return cellSortValue(row, index);
                    });

                    decoratedRows.sort(function (left, right) {
                        const result = left.numeric !== null && right.numeric !== null
                            ? left.numeric - right.numeric
                            : left.text.localeCompare(right.text, "fr", { numeric: true });
                        return direction === "asc" ? result : -result;
                    });
                    decoratedRows.forEach(function (item) { tbody.appendChild(item.row); });
                });
            });
        });
    }

    function waitForIdle() {
        return new Promise(function (resolve) {
            if ("requestIdleCallback" in window) {
                window.requestIdleCallback(resolve, { timeout: 120 });
                return;
            }
            setTimeout(resolve, 0);
        });
    }

    function csvEscape(value) {
        return '"' + String(value || "").replace(/\s+/g, " ").trim().replace(/"/g, '""') + '"';
    }

    async function formatItemsInChunks(items, formatter) {
        const rows = [];
        const chunkSize = 80;
        for (let index = 0; index < items.length; index += chunkSize) {
            const chunk = items.slice(index, index + chunkSize);
            chunk.forEach(function (item) {
                rows.push(formatter(item));
            });
            await waitForIdle();
        }
        return rows;
    }

    async function collectExportRows() {
        const visibleRows = Array.from(document.querySelectorAll("tbody tr")).filter(function (row) {
            return row.style.display !== "none";
        });

        if (visibleRows.length) {
            return formatItemsInChunks(visibleRows, function (row) {
                return Array.from(row.cells).map(function (cell) {
                    return csvEscape(cell.textContent);
                }).join(",");
            });
        }

        const visibleTargets = getSearchTargets().filter(function (target) {
            return target.style.display !== "none";
        });
        return formatItemsInChunks(visibleTargets, function (target) {
            return csvEscape(target.textContent);
        });
    }

    async function exportVisibleData() {
        core.showMessage("Preparation de l'export...");
        const rows = await collectExportRows();
        if (!rows.length) {
            core.showMessage("Aucune donnee visible a exporter.");
            return;
        }

        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "theway-export.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
        core.showMessage("Export prepare.");
    }

    function initGenericActions() {
        document.addEventListener("click", function (event) {
            const exportButton = event.target.closest(".btn-export, [data-action='export']");
            if (exportButton) {
                event.preventDefault();
                exportVisibleData();
                return;
            }

            const passiveButton = event.target.closest(".premium-btn, .btn-plan, .btn-launch, .refresh-btn, .view-all-btn, .help-btn, .add-link-btn, .btn-validate, .btn-review, .btn-view");
            if (passiveButton && !passiveButton.closest("form")) {
                const label = passiveButton.textContent.replace(/\s+/g, " ").trim() || "Action";
                core.showMessage(label + " active.");
            }
        });
    }

    function initBookmarks() {
        const saved = core.readJSON(core.SAVED_LINKS_KEY, {});
        document.querySelectorAll(".opportunity-card").forEach(function (card) {
            const titleElement = card.querySelector(".opp-title, h3, h2");
            const title = core.normalize(titleElement ? titleElement.textContent : card.textContent.slice(0, 80));
            const bookmark = card.querySelector(".opp-bookmark");
            if (saved[title] && bookmark) bookmark.classList.add("bookmarked");
            card.addEventListener("click", function () {
                setTimeout(function () {
                    if (!bookmark) return;
                    saved[title] = bookmark.classList.contains("bookmarked");
                    core.writeJSON(core.SAVED_LINKS_KEY, saved);
                }, 0);
            });
        });
    }

    function initNotificationBadges() {
        document.querySelectorAll(".header-btn, .notification-btn").forEach(function (button) {
            if (!button.querySelector(".badge") && !core.normalize(button.textContent).includes("notification")) return;
            button.addEventListener("click", function () {
                const badge = button.querySelector(".badge, .notification-badge");
                if (badge) {
                    badge.textContent = "0";
                    badge.style.display = "none";
                }
            });
        });
    }

    app.ui = {
        init: function () {
            initSearchAndFilters();
            initTableSorting();
            initGenericActions();
            initBookmarks();
            initNotificationBadges();
        },
        applyTextFilter: applyTextFilter,
        exportVisibleData: exportVisibleData
    };
})(window, document);
