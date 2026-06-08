(function (window, document) {
    "use strict";

    function createElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function createTextCell(text, style) {
        const cell = document.createElement("td");
        cell.textContent = text;
        if (style) cell.setAttribute("style", style);
        return cell;
    }

    function appendRowsInChunks(data, createRow, tableBodyId) {
        const tbody = document.getElementById(tableBodyId || "tableBody");
        if (!tbody) return;

        tbody.textContent = "";
        const chunkSize = 40;
        let index = 0;

        function appendChunk() {
            const fragment = document.createDocumentFragment();
            const end = Math.min(index + chunkSize, data.length);
            for (; index < end; index++) {
                fragment.appendChild(createRow(data[index], index));
            }
            tbody.appendChild(fragment);
            if (index < data.length) requestAnimationFrame(appendChunk);
        }

        appendChunk();
    }

    function createInfoRow(labelText, valueText) {
        const row = createElement("div", "info-row");
        row.appendChild(createElement("span", "label", labelText));
        row.appendChild(createElement("span", "value", valueText));
        return row;
    }

    function createStatusInfoRow(labelText, statusText, statusClass) {
        const row = createElement("div", "info-row");
        const value = createElement("span", "value");
        value.appendChild(createElement("span", "status-badge " + statusClass, statusText));
        row.appendChild(createElement("span", "label", labelText));
        row.appendChild(value);
        return row;
    }

    function createLinkInfoRow(labelText, linkText) {
        const row = createElement("div", "info-row");
        const value = createElement("span", "value");
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = linkText;
        value.appendChild(link);
        row.appendChild(createElement("span", "label", labelText));
        row.appendChild(value);
        return row;
    }

    function createGrowthInfoRow(labelText, valueText) {
        const row = createElement("div", "info-row");
        const value = createElement("span", "value", valueText);
        value.style.color = "var(--green)";
        row.appendChild(createElement("span", "label", labelText));
        row.appendChild(value);
        return row;
    }

    window.TheWayTable = {
        createElement: createElement,
        createTextCell: createTextCell,
        appendRowsInChunks: appendRowsInChunks,
        createInfoRow: createInfoRow,
        createStatusInfoRow: createStatusInfoRow,
        createLinkInfoRow: createLinkInfoRow,
        createGrowthInfoRow: createGrowthInfoRow
    };
})(window, document);
